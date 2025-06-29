const config = require('../config');

async function executeCategoryCommand(interaction, features, logger) {
    try {
        // Check if user has staff role
        const hasStaffRole = interaction.member.roles.cache.has(config.bot.staffRoleId);
        if (!hasStaffRole) {
            return await interaction.reply({
                content: 'Only staff members can set ticket categories.',
                ephemeral: true
            });
        }

        // Get the category type
        const type = interaction.options.getString('type');

        // Validate category type
        const validCategories = ['server', 'coins', 'refund', 'plugins', 'performance', 'other'];
        if (!validCategories.includes(type)) {
            return await interaction.reply({
                content: 'Invalid category. Please use: server, coins, plugins, performance, or other',
                ephemeral: true
            });
        }

        // Category colors and emoji mapping
        const categoryInfo = {
            server: { color: '#FF0000', emoji: '🖥️' },
            coins: { color: '#FFD700', emoji: '💰' },
            refund: { color: '#FFD700', emoji: '💰' },
            plugins: { color: '#00FF00', emoji: '🔌' },
            performance: { color: '#0000FF', emoji: '⚡' },
            other: { color: '#808080', emoji: '📌' },
        };

        // Create category embed
        const categoryEmbed = {
            color: parseInt(categoryInfo[type].color.replace('#', ''), 16),
            title: `${categoryInfo[type].emoji} Ticket Category: ${type.toUpperCase()}`,
            description: `This ticket has been categorized as **${type}**`,
            footer: {
                text: `Set by ${interaction.user.tag}`
            },
            timestamp: new Date()
        };

        // Store category using TicketFeatures
        await features.setCategory(interaction.channel.id, {
            type,
            setBy: interaction.user.id,
            setAt: new Date()
        });

        // Update channel name to include category
        try {
            const currentName = interaction.channel.name;
            const newName = currentName.replace(/^\[.*?\]/, '').trim();
            await interaction.channel.setName(`[${type.toUpperCase()}] ${newName}`);
        } catch (error) {
            logger.warn('Could not update channel name:', error);
        }

        // Send response
        await interaction.reply({ embeds: [categoryEmbed] });

        logger.info(`Category set to ${type} for ticket ${interaction.channel.id} by ${interaction.user.tag}`);
    } catch (error) {
        logger.error('Error in category command:', error);
        throw error;
    }
}

module.exports = { executeCategoryCommand }; 