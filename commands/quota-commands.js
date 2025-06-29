const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function executeStartQuotaCommand(interaction, dataManager, logger) {
  try {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({
        content: 'Only administrators can set quotas.',
        ephemeral: true
      });
      return;
    }

    const amount = interaction.options.getInteger('amount');
    const reset = interaction.options.getBoolean('reset');

    await dataManager.setQuota(amount, interaction.guild);
    
    if (reset) {
      await dataManager.resetMonthlyStats();
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Monthly Quota System')
      .setDescription(`Monthly quota has been set to ${amount} tickets${reset ? ' and all monthly stats have been reset' : ''}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error handling start quota command:', error);
    throw error;
  }
}

async function executeEndQuotaCommand(interaction, dataManager, logger) {
  try {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({
        content: 'Only administrators can end quota periods.',
        ephemeral: true
      });
      return;
    }

    const currentQuota = dataManager.quotas.get('monthlyQuota');
    if (!currentQuota) {
      await interaction.reply({
        content: 'No active quota period to end.',
        ephemeral: true
      });
      return;
    }

    const success = await dataManager.endQuota(interaction.guild);
    if (!success) {
      await interaction.reply({
        content: 'Failed to end quota period.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Quota Period Ended')
      .setDescription('The current quota period has been ended and results have been saved.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error handling end quota command:', error);
    throw error;
  }
}

async function executeQuotaStatsCommand(interaction, dataManager, logger) {
  try {
    const currentQuota = dataManager.quotas.get('monthlyQuota');
    if (!currentQuota) {
      await interaction.reply({
        content: 'No active quota period.',
        ephemeral: true
      });
      return;
    }

    const staffMembers = await interaction.guild.members.fetch();
    const staffList = staffMembers.filter(member => 
      member.roles.cache.has(config.bot.staffRoleId)
    );

    let description = `**Current Quota: ${currentQuota} tickets**\n\n`;

    for (const [_, member] of staffList) {
      const stats = dataManager.staffStats.get(member.id) || { monthlyTickets: 0 };
      const percentage = ((stats.monthlyTickets || 0) / currentQuota) * 100;
      description += `${member.user.username}: ${stats.monthlyTickets || 0}/${currentQuota} (${percentage.toFixed(1)}%)\n`;
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Current Quota Statistics')
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logger.error('Error handling quota stats command:', error);
    throw error;
  }
}

async function executeQuotaHistoryCommand(interaction, dataManager, logger) {
  try {
    const history = Array.from(dataManager.quotaHistory.values());
    if (history.length === 0) {
      await interaction.reply({
        content: 'No quota history available.',
        ephemeral: true
      });
      return;
    }

    let description = '';
    for (const period of history.slice(-5)) {
      description += `**Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}**\n`;
      description += `Quota Target: ${period.quota} tickets\n\n`;
      
      for (const [staffId, results] of Object.entries(period.staffResults)) {
        try {
          const member = await interaction.guild.members.fetch(staffId);
          description += `${member.user.username}: ${results.monthlyTickets}/${period.quota} (${results.percentageAchieved.toFixed(1)}%)\n`;
        } catch (error) {
          logger.error(`Error fetching member ${staffId}:`, error);
          description += `Unknown User: ${results.monthlyTickets}/${period.quota} (${results.percentageAchieved.toFixed(1)}%)\n`;
        }
      }
      description += '\n---\n\n';
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Quota History')
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logger.error('Error handling quota history command:', error);
    throw error;
  }
}

module.exports = {
  executeStartQuotaCommand,
  executeEndQuotaCommand,
  executeQuotaStatsCommand,
  executeQuotaHistoryCommand
};