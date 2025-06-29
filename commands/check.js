const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function executeCheckCommand(interaction, dataManager) {
  try {
    if (!interaction.channel.isThread()) {
      await interaction.reply({ content: config.messages.errors.notThread, ephemeral: true });
      return;
    }

    const threadId = interaction.channel.id;
    const staffContributors = Array.from(dataManager.contributions.get(threadId) || new Set());
    const staffNames = await Promise.all(
      staffContributors.map(async (id) => {
        try {
          const member = await interaction.guild.members.fetch(id);
          return member.user.username;
        } catch {
          return `User ID: ${id}`;
        }
      })
    );

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Ticket Status')
      .setDescription(`This ticket has been handled by: ${staffNames.join(', ') || 'No staff have contributed yet'}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    throw error;
  }
}

module.exports = { executeCheckCommand };