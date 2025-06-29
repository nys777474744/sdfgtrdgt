const { inviteTracker } = require('../utils/inviteTracker');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client, logger) {
        try {
            inviteTracker.handleMemberLeave(member);
            logger.info(`Member ${member.user.tag} left the server`);
        } catch (error) {
            logger.error('Error in guildMemberRemove event:', error);
        }
    }
}; 