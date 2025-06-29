const { inviteTracker } = require('../utils/inviteTracker');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client, logger) {
        try {
            const inviteData = await inviteTracker.trackJoin(member);
            
            if (inviteData) {
                logger.info(`Member ${member.user.tag} joined using invite code ${inviteData.code} from ${inviteData.inviter}`);
                
                if (inviteData.isFake) {
                    logger.warn(`Potential fake invite detected for ${member.user.tag}`);
                }
            } else {
                logger.warn(`Could not track invite for member ${member.user.tag}`);
            }
        } catch (error) {
            logger.error('Error in guildMemberAdd event:', error);
        }
    }
}; 