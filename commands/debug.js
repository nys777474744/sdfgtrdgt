const config = require('../config');
const { EmbedBuilder } = require('discord.js');

async function executeDebugCommand(interaction, dataManager, ticketFeatures, logger) {
    try {
        // Check if user has staff role
        const hasStaffRole = interaction.member.roles.cache.has(config.bot.staffRoleId);
        if (!hasStaffRole) {
            return await interaction.reply({
                content: 'Only staff members can use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'tickets':
                await showTicketData(interaction, dataManager, ticketFeatures);
                break;
            case 'quotas':
                await showQuotaData(interaction, dataManager);
                break;
            case 'stats':
                await showStatistics(interaction, dataManager, ticketFeatures);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown subcommand',
                    ephemeral: true
                });
        }
    } catch (error) {
        logger.error('Error in debug command:', error);
        throw error;
    }
}

async function showTicketData(interaction, dataManager, ticketFeatures) {
    const channelId = interaction.channel.id;
    
    // Get all data for current ticket
    const contributors = Array.from(dataManager.contributions.get(channelId) || []);
    const priority = ticketFeatures.getPriority(channelId);
    const category = ticketFeatures.getCategory(channelId);

    const embed = new EmbedBuilder()
        .setTitle('🔷 🔍 Ticket Debug Information')
        .setDescription(`Debug data for ticket: ${interaction.channel.name}`)
        .addFields(
            { 
                name: '👥 Contributors',
                value: contributors.length > 0 
                    ? contributors.map(id => `<@${id}>`).join('\n')
                    : 'No contributors yet'
            },
            {
                name: '⚡ Priority',
                value: priority
                    ? `Level: ${priority.level}\nReason: ${priority.reason}\nSet by: <@${priority.setBy}>\nSet at: ${new Date(priority.setAt).toLocaleString()}`
                    : 'No priority set'
            },
            {
                name: '📁 Category',
                value: category
                    ? `Type: ${category.type}\nSet by: <@${category.setBy}>\nSet at: ${new Date(category.setAt).toLocaleString()}`
                    : 'No category set'
            }
        )
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

async function showQuotaData(interaction, dataManager) {
    const currentQuota = dataManager.quotas.get('monthlyQuota');
    const startDate = dataManager.quotas.get('startDate');
    const quotaHistory = Array.from(dataManager.quotaHistory.entries());

    const embed = new EmbedBuilder()
        .setTitle('🔷 📊 Quota Debug Information')
        .addFields(
            {
                name: '📈 Current Quota',
                value: currentQuota 
                    ? `Target: ${currentQuota}\nStart Date: ${new Date(startDate).toLocaleString()}`
                    : 'No active quota'
            }
        );

    // Add staff stats
    const staffStats = Array.from(dataManager.staffStats.entries());
    if (staffStats.length > 0) {
        embed.addFields({
            name: '👥 Staff Statistics',
            value: staffStats.map(([staffId, stats]) => (
                `<@${staffId}>:\nTotal: ${stats.totalTickets}\nMonthly: ${stats.monthlyTickets}\nActive: ${stats.activeTickets.size}`
            )).join('\n\n')
        });
    }

    // Add quota history in a separate embed
    const historyEmbed = quotaHistory.length > 0 ? new EmbedBuilder()
        .setTitle('🔷 📜 Quota History')
        .setDescription(
            quotaHistory.map(([id, data]) => (
                `**Period: ${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}**\n` +
                `Target: ${data.quota}\n` +
                Object.entries(data.staffResults).map(([staffId, result]) => 
                    `<@${staffId}>: ${result.monthlyTickets}/${data.quota} (${result.percentageAchieved.toFixed(1)}%)`
                ).join('\n')
            )).join('\n\n')
        ) : null;

    await interaction.reply({
        embeds: historyEmbed ? [embed, historyEmbed] : [embed],
        ephemeral: true
    });
}

async function showStatistics(interaction, dataManager, ticketFeatures) {
    const stats = ticketFeatures.getStatistics();
    
    const embed = new EmbedBuilder()
        .setTitle('🔷 📊 System Statistics')
        .addFields(
            {
                name: '🎯 Priorities',
                value: Object.entries(stats.priorities)
                    .map(([level, count]) => `${level}: ${count}`)
                    .join('\n') || 'No priorities set',
                inline: true
            },
            {
                name: '📁 Categories',
                value: Object.entries(stats.categories)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join('\n') || 'No categories set',
                inline: true
            }
        )
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

module.exports = { executeDebugCommand }; 