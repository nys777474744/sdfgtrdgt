const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function sendModLog(guild, options) {
  try {
    const channel = await guild.channels.fetch(config.bot.modLogChannelId);
    if (!channel) {
      throw new Error('Mod log channel not found');
    }

    const embed = new EmbedBuilder()
      .setColor(options.color || config.colors.primary)
      .setTitle(options.title)
      .setDescription(options.description)
      .setTimestamp();

    if (options.fields) {
      embed.addFields(options.fields);
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    throw error;
  }
}

module.exports = { sendModLog };