const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { sendModLog } = require('../utils/mod-log');

async function executeContributionRequestCommand(interaction, dataManager, logger) {
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

    // Get ticket creator username from options
    const creatorUsername = interaction.options.getString('creator');
    
    // Find closed tickets created by this user
    const guild = interaction.guild;
    const ticketChannel = await guild.channels.fetch(config.bot.ticketChannelId);
    
    if (!ticketChannel || !ticketChannel.threads) {
      await interaction.reply({ 
        content: 'Could not access the ticket channel. Please contact an administrator.', 
        ephemeral: true 
      });
      return;
    }
    
    // Fetch archived threads
    const archivedThreads = await ticketChannel.threads.fetchArchived();
    
    // Find all threads that might match the creator
    const potentialThreads = [];
    
    for (const [threadId, thread] of archivedThreads.threads) {
      try {
        const starterMessage = await thread.fetchStarterMessage().catch(() => null);
        if (starterMessage && starterMessage.author.username.toLowerCase().includes(creatorUsername.toLowerCase())) {
          potentialThreads.push({
            thread,
            creator: starterMessage.author
          });
        }
      } catch (error) {
        // Skip threads with errors
        continue;
      }
    }
    
    if (potentialThreads.length === 0) {
      await interaction.editReply({ 
        content: `Could not find any closed tickets created by a user with username containing "${creatorUsername}".`
      });
      return;
    }
    
    // If there's only one match, use it directly
    if (potentialThreads.length === 1) {
      const { thread, creator } = potentialThreads[0];
      const ticketId = thread.id;
      const ticketCreator = creator;
      
      // Continue with the single match
      const staffId = interaction.user.id;
      const staffName = interaction.member.nickname || interaction.user.username;
      
      // Check if the staff member is already credited for this ticket
      const staffStats = dataManager.staffStats.get(staffId) || { totalTickets: 0, activeTickets: new Set() };
      const contributions = dataManager.contributions.get(ticketId) || new Set();
      
      if (contributions.has(staffId)) {
        await interaction.reply({ 
          content: 'You are already credited for contributing to this ticket.', 
          ephemeral: true 
        });
        return;
      }
      
      // Process the contribution request for the single match
      await processContributionRequest(interaction, ticketId, ticketCreator, thread.name, staffId, staffName, dataManager, logger);
    } else {
      // Discord has a limit of 25 options in select menus
      if (potentialThreads.length > 25) {
        await interaction.editReply({
          content: `Found ${potentialThreads.length} tickets by users with username containing "${creatorUsername}". Please provide a more specific username as Discord limits selection menus to 25 options.`
        });
        return;
      }

      const options = potentialThreads.map((item, index) => ({
        label: `${item.thread.name} (by ${item.creator.username})`,
        value: `${index}`
      }));
      
      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_ticket_for_contribution')
            .setPlaceholder('Select the ticket you helped with')
            .addOptions(options)
        );
      
      await interaction.editReply({
        content: `Found ${potentialThreads.length} tickets by users with username containing "${creatorUsername}". Please select the specific ticket:`,
        components: [row]
      });
      
      // Store the potential threads in the client for the selection handler
      if (!interaction.client.potentialContributionThreads) {
        interaction.client.potentialContributionThreads = new Map();
      }
      
      interaction.client.potentialContributionThreads.set(interaction.user.id, {
        threads: potentialThreads,
        requestedAt: new Date()
      });
      
      return;
    }
  } catch (error) {
    logger.error('Error executing contribution request command:', error);
    await interaction.editReply({ 
      content: 'An error occurred while processing your request. Please try again later.'
    });
  }
}

// Function to process a contribution request
async function processContributionRequest(interaction, ticketId, ticketCreator, ticketName, staffId, staffName, dataManager, logger) {
  try {
    // Try to send a DM to the ticket creator
    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`contrib_yes_${staffId}_${ticketId}`)
          .setLabel('Yes, they helped')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`contrib_no_${staffId}_${ticketId}`)
          .setLabel('No, they did not help')
          .setStyle(ButtonStyle.Danger)
      );
    
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Staff Contribution Request')
      .setDescription(`**${staffName}** has requested credit for helping with your ticket: "${ticketName}".

Did this staff member help you with your issue?`)
      .setTimestamp();
    
    try {
      await ticketCreator.send({ 
        embeds: [embed],
        components: [confirmRow]
      });
      
      // Store the request in the client for tracking
      if (!interaction.client.contributionRequests) {
        interaction.client.contributionRequests = new Map();
      }
      
      interaction.client.contributionRequests.set(`${staffId}_${ticketId}`, {
        staffId,
        ticketId,
        ticketName,
        requestedAt: new Date(),
        status: 'pending'
      });
      
      // Log the request
      await sendModLog(interaction.guild, {
        title: 'Contribution Request Sent',
        description: `${staffName} has requested contribution credit for ticket "${ticketName}"`,
        fields: [
          { name: 'Staff Member', value: staffName },
          { name: 'Ticket', value: ticketName },
          { name: 'Ticket ID', value: ticketId }
        ]
      });
      
      logger.info(`Contribution request sent by ${staffName} for ticket ${ticketName}`);
      
      // If this is a new interaction, defer and edit. Otherwise, just edit.
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      await interaction.editReply({ 
        content: `Contribution request sent to ${ticketCreator.username} for ticket "${ticketName}". They will receive a DM to confirm your contribution.`
      });
    } catch (dmError) {
      // If this is a new interaction, defer and edit. Otherwise, just edit.
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      await interaction.editReply({ 
        content: 'Could not send a message to the ticket creator. They may have DMs disabled or are no longer in the server.'
      });
      logger.error('Error sending DM to ticket creator:', dmError);
    }
  } catch (error) {
    logger.error('Error in processContributionRequest:', error);
    // If this is a new interaction, defer and edit. Otherwise, just edit.
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }
    await interaction.editReply({ 
      content: 'An error occurred while processing your request. Please try again later.'
    });
  }
}

// Handle the button response from the ticket creator
async function handleContributionResponse(interaction, dataManager, logger) {
  try {
    const [action, staffId, ticketId] = interaction.customId.split('_').slice(1);
    
    // Check if this is a valid request
    if (!interaction.client.contributionRequests) {
      await interaction.reply({ content: 'This request is no longer valid.', ephemeral: true });
      return;
    }
    
    const request = interaction.client.contributionRequests.get(`${staffId}_${ticketId}`);
    if (!request) {
      await interaction.reply({ content: 'This request is no longer valid.', ephemeral: true });
      return;
    }
    
    // Get the staff member
    const guild = await interaction.client.guilds.fetch(config.bot.guildId);
    const staffMember = await guild.members.fetch(staffId).catch(() => null);
    
    if (!staffMember) {
      await interaction.reply({ content: 'The staff member is no longer available.', ephemeral: true });
      return;
    }
    
    if (action === 'yes') {
      // Award the contribution point
      await dataManager.closeTicket(ticketId, [staffId]);
      
      // Update the request status
      request.status = 'approved';
      interaction.client.contributionRequests.set(`${staffId}_${ticketId}`, request);
      
      // Notify the user
      const successEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Contribution Confirmed')
        .setDescription(`You've confirmed that **${staffMember.nickname || staffMember.user.username}** helped with your ticket "${request.ticketName}". They have been awarded a contribution point.`)
        .setTimestamp();
      
      await interaction.update({ 
        embeds: [successEmbed], 
        components: [] 
      });
      
      // Notify the staff member
      try {
        const staffNotificationEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('Contribution Request Approved')
          .setDescription(`Your contribution request for ticket "${request.ticketName}" has been approved by the ticket creator. You have been awarded a contribution point.`)
          .setTimestamp();
        
        await staffMember.send({ embeds: [staffNotificationEmbed] });
      } catch (error) {
        logger.error('Error sending staff notification:', error);
      }
      
      // Log the approval
      await sendModLog(guild, {
        title: 'Contribution Request Approved',
        description: `${staffMember.nickname || staffMember.user.username}'s contribution request for ticket "${request.ticketName}" was approved`,
        fields: [
          { name: 'Staff Member', value: staffMember.user.username },
          { name: 'Ticket', value: request.ticketName },
          { name: 'Ticket ID', value: ticketId }
        ]
      });
      
      logger.info(`Contribution request approved for ${staffMember.nickname || staffMember.user.username} on ticket ${request.ticketName}`);
    } else {
      // Deny the request
      request.status = 'denied';
      interaction.client.contributionRequests.set(`${staffId}_${ticketId}`, request);
      
      // Notify the user
      const denyEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('Contribution Request Denied')
        .setDescription(`You've indicated that **${staffMember.nickname || staffMember.user.username}** did not help with your ticket "${request.ticketName}". No contribution point has been awarded.`)
        .setTimestamp();
      
      await interaction.update({ 
        embeds: [denyEmbed], 
        components: [] 
      });
      
      // Notify the staff member
      try {
        const staffNotificationEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('Contribution Request Denied')
          .setDescription(`Your contribution request for ticket "${request.ticketName}" was denied by the ticket creator.`)
          .setTimestamp();
        
        await staffMember.send({ embeds: [staffNotificationEmbed] });
      } catch (error) {
        logger.error('Error sending staff notification:', error);
      }
      
      // Log the denial
      await sendModLog(guild, {
        title: 'Contribution Request Denied',
        description: `${staffMember.nickname || staffMember.user.username}'s contribution request for ticket "${request.ticketName}" was denied`,
        fields: [
          { name: 'Staff Member', value: staffMember.user.username },
          { name: 'Ticket', value: request.ticketName },
          { name: 'Ticket ID', value: ticketId }
        ]
      });
      
      logger.info(`Contribution request denied for ${staffMember.nickname || staffMember.user.username} on ticket ${request.ticketName}`);
    }
  } catch (error) {
    logger.error('Error handling contribution response:', error);
    await interaction.reply({ 
      content: 'An error occurred while processing your response. Please contact a server administrator.', 
      ephemeral: true 
    });
  }
}

module.exports = {
  executeContributionRequestCommand,
  handleContributionResponse,
  processContributionRequest
};
