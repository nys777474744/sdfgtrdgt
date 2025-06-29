const config = require('../config');

async function executePriorityCommand(interaction, features, logger) {
    try {
        // Check if user has staff role
        const hasStaffRole = interaction.member.roles.cache.has(config.bot.staffRoleId);
        if (!hasStaffRole) {
            return await interaction.reply({
                content: 'Only staff members can set ticket priorities.',
                ephemeral: true
            });
        }

        // Get command options
        const level = interaction.options.getString('level');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Validate priority level
        const validLevels = ['urgent', 'high', 'normal', 'low'];
        if (!validLevels.includes(level)) {
            return await interaction.reply({
                content: 'Invalid priority level. Please use: urgent, high, normal, or low',
                ephemeral: true
            });
        }

        // Priority emojis and colors
        const priorityEmojis = {
            urgent: '🔴',
            high: '🟡',
            normal: '🟢',
            low: '⚪'
        };

        const priorityColors = {
            urgent: '#FF0000',
            high: '#FF9900',
            normal: '#00FF00',
            low: '#808080'
        };

        // Create priority embed
        const priorityEmbed = {
            color: parseInt(priorityColors[level].replace('#', ''), 16),
            title: `Ticket Priority: ${level.toUpperCase()}`,
            description: `This ticket's priority has been set to **${level}**\nReason: ${reason}`,
            footer: {
                text: `Set by ${interaction.user.tag}`
            },
            timestamp: new Date()
        };

        // Store priority using TicketFeatures first
        await features.setPriority(interaction.channel.id, {
            level,
            reason,
            setBy: interaction.user.id,
            setAt: new Date()
        });

        // Send response immediately to prevent interaction timeout
        await interaction.reply({ embeds: [priorityEmbed] });

        try {
            // Update channel name with priority emoji
            const channel = interaction.channel;
            const currentName = channel.name;
            
            // Remove any existing priority emojis
            const cleanName = currentName.replace(/^[🔴🟡🟢⚪]\s*/, '');
            
            // Add new priority emoji
            const newName = `${priorityEmojis[level]} ${cleanName}`;
            await channel.setName(newName);
        } catch (error) {
            logger.error('Error updating channel name:', error);
            await interaction.followUp({
                content: 'Priority was set but there was an error updating the channel name.',
                ephemeral: true
            }).catch(() => {}); // Ignore followUp errors
        }

        logger.info(`Priority set to ${level} for ticket ${interaction.channel.id} by ${interaction.user.tag}`);
    } catch (error) {
        logger.error('Error in priority command:', error);
        // Only throw if we haven't replied to the interaction yet
        if (!interaction.replied) {
            throw error;
        }
    }
}

module.exports = { executePriorityCommand }; 