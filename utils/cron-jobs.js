const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

function setupCronJobs(client, dataManager, logger) {
  // Run at 00:00:00 (midnight) on the first day of every month
  cron.schedule('0 0 1 * *', async () => {
    try {
      logger.info('Running monthly quota initialization cron job');
      
      const guild = client.guilds.cache.get(config.bot.guildId);
      if (!guild) {
        logger.error('Could not find guild for quota initialization');
        return;
      }

      // Default monthly quota amount
      const DEFAULT_QUOTA = 15; // One ticket per day average

      // End previous quota period if exists
      const currentQuota = dataManager.quotas.get('monthlyQuota');
      if (currentQuota) {
        const success = await dataManager.endQuota(guild);
        if (!success) {
          logger.error('Failed to end previous quota period');
          return;
        }
        logger.info('Successfully ended previous quota period');
      }

      // Start new quota period
      await dataManager.setQuota(DEFAULT_QUOTA, guild);
      await dataManager.resetMonthlyStats();
      logger.info('Started new monthly quota period');

      // Send announcement message
      const announcementChannel = await guild.channels.fetch(config.bot.announcementChannelId);
      if (announcementChannel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('New Monthly Quota Period Started')
          .setDescription(`A new quota period has begun!\n\n**Monthly Quota Target:** ${DEFAULT_QUOTA} tickets\n**Period Start:** ${new Date().toLocaleDateString()}\n\nGood luck everyone! 🎉`)
          .setTimestamp();

        await announcementChannel.send({
          content: `<@&${config.bot.staffRoleId}>`,
          embeds: [embed]
        });
        logger.info('Sent monthly quota announcement');
      } else {
        logger.error('Could not find announcement channel');
      }
    } catch (error) {
      logger.error('Error in monthly quota initialization cron job:', error);
    }
  });

  // Daily backup at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await dataManager.saveData();
      logger.info('Daily backup completed successfully');
    } catch (error) {
      logger.error('Error in daily backup cron job:', error);
    }
  });
}

module.exports = { setupCronJobs };