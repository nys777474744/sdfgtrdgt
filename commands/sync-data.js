const { EmbedBuilder } = require('discord.js');
const { DataAPIClient } = require('../utils/api-client');
const config = require('../config');

async function executeSyncDataCommand(interaction, dataManager, logger) {
    try {
        // Check if user has admin permissions
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({
                content: 'Only administrators can sync data from other servers.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const sourceUrl = interaction.options.getString('source_url');
        const dataType = interaction.options.getString('data_type');

        // Create API client
        const apiClient = new DataAPIClient(sourceUrl, logger);

        // Test connection first
        try {
            await apiClient.checkHealth();
        } catch (error) {
            await interaction.editReply({
                content: `❌ Failed to connect to source server: ${error.message}`
            });
            return;
        }

        let syncedData;
        let syncDescription;

        try {
            switch (dataType) {
                case 'all':
                    syncedData = await apiClient.getAllData();
                    syncDescription = 'All data synced successfully';
                    
                    // Merge the data carefully
                    if (syncedData.staffStats) {
                        // Merge staff stats
                        for (const [staffId, stats] of Object.entries(syncedData.staffStats)) {
                            const existingStats = dataManager.staffStats.get(staffId) || {
                                totalTickets: 0,
                                activeTickets: new Set(),
                                monthlyTickets: 0
                            };
                            
                            dataManager.staffStats.set(staffId, {
                                totalTickets: Math.max(existingStats.totalTickets, stats.totalTickets || 0),
                                activeTickets: new Set([...existingStats.activeTickets, ...(stats.activeTickets || [])]),
                                monthlyTickets: Math.max(existingStats.monthlyTickets, stats.monthlyTickets || 0)
                            });
                        }
                    }
                    
                    if (syncedData.quotaHistory) {
                        // Merge quota history
                        for (const [key, value] of Object.entries(syncedData.quotaHistory)) {
                            dataManager.quotaHistory.set(key, value);
                        }
                    }
                    break;

                case 'staff_stats':
                    syncedData = await apiClient.getStaffStats();
                    syncDescription = `Synced ${syncedData.length} staff member statistics`;
                    
                    // Merge staff stats
                    for (const staffData of syncedData) {
                        const existingStats = dataManager.staffStats.get(staffData.staffId) || {
                            totalTickets: 0,
                            activeTickets: new Set(),
                            monthlyTickets: 0
                        };
                        
                        dataManager.staffStats.set(staffData.staffId, {
                            totalTickets: Math.max(existingStats.totalTickets, staffData.totalTickets),
                            activeTickets: existingStats.activeTickets,
                            monthlyTickets: Math.max(existingStats.monthlyTickets, staffData.monthlyTickets)
                        });
                    }
                    break;

                case 'quota_data':
                    syncedData = await apiClient.getQuotaData();
                    syncDescription = 'Quota data and history synced successfully';
                    
                    // Merge quota history
                    for (const [key, value] of Object.entries(syncedData.history)) {
                        dataManager.quotaHistory.set(key, value);
                    }
                    break;

                case 'contributions':
                    syncedData = await apiClient.getDataSection('contributions');
                    syncDescription = `Synced ${Object.keys(syncedData).length} contribution records`;
                    
                    // Note: Contributions are ticket-specific, so we don't merge them
                    // This is mainly for reference/backup purposes
                    break;

                default:
                    await interaction.editReply({
                        content: '❌ Invalid data type specified.'
                    });
                    return;
            }

            // Save the updated data
            await dataManager.saveData();

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Data Sync Successful')
                .setDescription(syncDescription)
                .addFields(
                    { name: 'Source', value: sourceUrl },
                    { name: 'Data Type', value: dataType },
                    { name: 'Synced At', value: new Date().toLocaleString() }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            logger.info(`Data sync completed: ${dataType} from ${sourceUrl} by ${interaction.user.tag}`);

        } catch (error) {
            await interaction.editReply({
                content: `❌ Failed to sync data: ${error.message}`
            });
            logger.error('Data sync error:', error);
        }

    } catch (error) {
        logger.error('Error in sync data command:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'An error occurred while syncing data.',
                ephemeral: true
            });
        }
    }
}

module.exports = { executeSyncDataCommand };