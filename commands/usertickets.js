const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function executeUserTicketsCommand(interaction, logger) {
  try {
    // Defer the reply immediately to prevent interaction timeout
    await interaction.deferReply({ ephemeral: true });

    // Check if the user is a staff member
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isStaff = member.roles.cache.has(config.bot.staffRoleId);
    
    if (!isStaff) {
      await interaction.editReply({ 
        content: 'This command is only available to staff members.'
      });
      return;
    }

    // Get username from options
    const username = interaction.options.getString('username');
    
    // Find tickets created by this user
    const guild = interaction.guild;
    const ticketChannel = await guild.channels.fetch(config.bot.ticketChannelId);
    
    if (!ticketChannel || !ticketChannel.threads) {
      await interaction.editReply({ 
        content: 'Could not access the ticket channel. Please contact an administrator.'
      });
      return;
    }
    
    // Fetch both active and archived threads
    const [activeThreads, archivedThreads] = await Promise.all([
      ticketChannel.threads.fetchActive(),
      ticketChannel.threads.fetchArchived()
    ]);
    
    const userTickets = [];
    
    // Helper function to process threads
    const processThreads = async (threads) => {
      for (const [threadId, thread] of threads) {
        try {
          const starterMessage = await thread.fetchStarterMessage().catch(() => null);
          if (starterMessage && starterMessage.author.username.toLowerCase().includes(username.toLowerCase())) {
            userTickets.push({
              thread,
              creator: starterMessage.author,
              status: thread.archived ? 'Closed' : 'Open',
              createdAt: thread.createdAt
            });
          }
        } catch (error) {
          // Skip threads with errors
          continue;
        }
      }
    };
    
    // Process both active and archived threads
    await processThreads(activeThreads.threads);
    await processThreads(archivedThreads.threads);
    
    if (userTickets.length === 0) {
      await interaction.editReply({ 
        content: `Could not find any tickets created by a user with username containing "${username}".`
      });
      return;
    }
    
    // Sort tickets by creation date (newest first)
    userTickets.sort((a, b) => b.createdAt - a.createdAt);
    
    // Create an embed to display the tickets
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`Tickets by "${username}"`)
      .setDescription(`Found ${userTickets.length} ticket(s)`)
      .setTimestamp();
    
    // Discord has a limit of 25 fields per embed
    const maxTicketsPerEmbed = 25;
    const totalEmbeds = Math.ceil(userTickets.length / maxTicketsPerEmbed);
    const embeds = [];
    
    for (let i = 0; i < totalEmbeds; i++) {
      const startIdx = i * maxTicketsPerEmbed;
      const endIdx = Math.min(startIdx + maxTicketsPerEmbed, userTickets.length);
      const currentEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`Tickets by "${username}" (Page ${i + 1}/${totalEmbeds})`)
        .setDescription(`Found ${userTickets.length} ticket(s)`)
        .setTimestamp();

      // Add ticket information to the current embed
      userTickets.slice(startIdx, endIdx).forEach((ticket, index) => {
        const createdDate = ticket.createdAt.toLocaleDateString();
        const createdTime = ticket.createdAt.toLocaleTimeString();
        
        currentEmbed.addFields({
          name: `${startIdx + index + 1}. ${ticket.thread.name}`,
          value: `**Status:** ${ticket.status}\n**Created:** ${createdDate} ${createdTime}\n**Creator:** ${ticket.creator.username}\n**ID:** ${ticket.thread.id}`
        });
      });
      
      embeds.push(currentEmbed);
    }
    
    // Send the response with all embeds
    await interaction.editReply({
      embeds: embeds
    });
    
    logger.info(`User tickets command executed by ${interaction.user.username} for search: ${username}`);
  } catch (error) {
    logger.error('Error executing user tickets command:', error);
    await interaction.editReply({ 
      content: 'An error occurred while processing your request. Please try again later.'
    });
  }
}

module.exports = {
  executeUserTicketsCommand
};
