const { inviteTracker } = require('../utils/inviteTracker');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client, logger) {
        try {
            // Initialize invite tracking
            const guild = await client.guilds.fetch(client.config.bot.guildId);
            await inviteTracker.init(guild);
            logger.info('Invite tracking system initialized');

            logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
        } catch (error) {
            logger.error('Error in ready event:', error);
        }
    }
}; 