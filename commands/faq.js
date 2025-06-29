const { EmbedBuilder } = require('discord.js');
const { getFaqByTopic } = require('../data/faq-responses');
const config = require('../config');

async function executeFaqCommand(interaction, logger) {
  try {
    await interaction.deferReply();

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(config.bot.staffRoleId)) {
      await interaction.editReply({ 
        content: 'Only staff members can use the FAQ command.',
        ephemeral: true 
      });
      return;
    }

    const topic = interaction.options.getString('topic');
    const faqResponse = getFaqByTopic(topic);
    
    if (!faqResponse) {
      await interaction.editReply({
        content: 'FAQ topic not found.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(faqResponse.color)
      .setTitle(faqResponse.title)
      .setDescription(faqResponse.description)
      .setFooter({ text: `FAQ sent by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`FAQ response "${faqResponse.title}" sent by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error handling FAQ command:', error);
    throw error;
  }
}

module.exports = { executeFaqCommand };