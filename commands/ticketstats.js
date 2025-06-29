const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

async function execute(interaction, dataManager, logger) {
  try {
    // Always defer reply first - this is critical for Discord interactions
    await interaction.deferReply();
    logger.info('Ticket stats command started by ' + interaction.user.tag);
    
    // Fetch the ticket channel
    const ticketChannel = await interaction.guild.channels.fetch('1332751958460600435');
    
    // Send initial status message
    const statusEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📊 Scanning Tickets...')
      .setDescription('```\nFetching active tickets...\n```')
      .setFooter({ text: 'Please wait while I scan all tickets...' });
    
    const statusMessage = await interaction.editReply({ embeds: [statusEmbed] });
    
    // Fetch active threads first
    const activeThreads = await ticketChannel.threads.fetchActive();
    const activeCount = Math.max(0, activeThreads.threads.size - 1); // Subtract 1 from active count
    
    // Fetch ALL archived threads using pagination
    let allArchivedThreads = [];
    let hasMore = true;
    let lastThreadId = null;
    let batchCount = 0;
    
    while (hasMore) {
      batchCount++;
      const options = { limit: 100 };
      if (lastThreadId) options.before = lastThreadId;
      
      // Update status message
      const currentTotal = allArchivedThreads.length + activeCount;
      const progressEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('📊 Scanning Tickets...')
        .setDescription('```\n' +
          `Active tickets: ${activeCount}\n` +
          `Archived found: ${allArchivedThreads.length}\n` +
          `Total so far: ${currentTotal}\n` +
          `Scanning batch #${batchCount}...\n` +
          '```')
        .setFooter({ text: 'Please wait while I scan all tickets...' });
      
      await statusMessage.edit({ embeds: [progressEmbed] });
      
      const archivedThreads = await ticketChannel.threads.fetchArchived(options);
      allArchivedThreads.push(...archivedThreads.threads.values());
      
      if (archivedThreads.threads.size < 100) {
        hasMore = false;
      } else {
        lastThreadId = [...archivedThreads.threads.values()].pop().id;
      }
      
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final status update
    const finalCount = allArchivedThreads.length + activeCount;
    const finalProgressEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📊 Scan Complete!')
      .setDescription('```\n' +
        `Active tickets: ${activeCount}\n` +
        `Archived found: ${allArchivedThreads.length}\n` +
        `Total tickets: ${finalCount}\n` +
        `Batches scanned: ${batchCount}\n` +
        '```')
      .setFooter({ text: 'Preparing final statistics...' });
    
    await statusMessage.edit({ embeds: [finalProgressEmbed] });
    
    // Combine all threads
    const allThreads = [...activeThreads.threads.values(), ...allArchivedThreads];
    
    // Calculate stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const totalTickets = allThreads.length;
    const activeTickets = Math.max(0, allThreads.filter(thread => !thread.archived).length - 1); // Subtract 1 from active count
    const monthlyTickets = allThreads.filter(thread => 
      new Date(thread.createdTimestamp) > thirtyDaysAgo
    ).length;
    const weeklyTickets = allThreads.filter(thread => 
      new Date(thread.createdTimestamp) > sevenDaysAgo
    ).length;
    
    const avgTicketsPerDay = Math.round((weeklyTickets / 7) * 10) / 10;
    
    // Log stats
    logger.info(`Found ${totalTickets} total tickets`);
    logger.info(`Found ${activeTickets} active tickets`);
    logger.info(`Found ${monthlyTickets} monthly tickets`);
    logger.info(`Found ${weeklyTickets} weekly tickets`);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📊 Ticket Statistics')
      .addFields(
        { name: '📅 This Month', value: `${monthlyTickets} tickets`, inline: true },
        { name: '📈 Past 7 Days', value: `${weeklyTickets} tickets`, inline: true },
        { name: '⚡ Active Now', value: `${activeTickets} tickets`, inline: true },
        { name: '📊 Daily Average (7d)', value: `${avgTicketsPerDay} tickets/day`, inline: true },
        { name: '📚 All Time', value: `${totalTickets} tickets`, inline: true }
      )
      .setFooter({ text: 'Based on actual Discord threads' })
      .setTimestamp();
    
    // Send the response
    await interaction.editReply({ embeds: [embed] });
    logger.info('Ticket stats command completed successfully');
  } catch (error) {
    logger.error('Error executing ticket stats command:', error);
    // Let the global error handler in command-handler.js handle this
    throw error;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketstats')
    .setDescription('View ticket statistics for different time periods'),
  execute
};
