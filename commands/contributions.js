const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function executeContributionsCommand(interaction, dataManager) {
  try {
    const guild = interaction.guild;
    const staffMembers = await guild.members.fetch();
    const staffList = staffMembers.filter(member => member.roles.cache.has(config.bot.staffRoleId));
    
    let description = '';
    
    const sortedStaff = Array.from(staffList.values()).sort((a, b) => {
      const statsA = dataManager.staffStats.get(a.id) || { totalTickets: 0 };
      const statsB = dataManager.staffStats.get(b.id) || { totalTickets: 0 };
      return statsB.totalTickets - statsA.totalTickets;
    });

    for (const staffMember of sortedStaff) {
      const stats = dataManager.staffStats.get(staffMember.id) || { totalTickets: 0, activeTickets: new Set() };
      const activeCount = stats.activeTickets ? stats.activeTickets.size : 0;
      description += `**${staffMember.user.username}**\n`;
      description += `• Total Tickets Handled: ${stats.totalTickets || 0}\n`;
      description += `• Active Tickets: ${activeCount}\n\n`;
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Staff Contributions')
      .setDescription(description || 'No contributions recorded yet.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    throw error;
  }
}

module.exports = { executeContributionsCommand };