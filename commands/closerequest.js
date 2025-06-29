const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { sendModLog } = require('../utils/mod-log');
const fs = require('fs').promises;
const path = require('path');
const { handleStaffClosure, handleSelectMenu } = require('../commands/close');

const scheduledClosuresPath = path.resolve(__dirname, '../scheduledClosures.json');

// Load scheduled closures from file
let scheduledClosures = {};

async function loadScheduledClosures(logger) {
  try {
    const exists = await fs.access(scheduledClosuresPath).then(() => true).catch(() => false);
    if (exists) {
      const data = await fs.readFile(scheduledClosuresPath, 'utf-8');
      scheduledClosures = JSON.parse(data);
      logger.info('Loaded scheduled closures successfully');
    } else {
      logger.info('No existing scheduled closures file found');
    }
  } catch (err) {
    logger.error('Failed to load scheduled closures file:', err);
    // Initialize with empty object on error
    scheduledClosures = {};
  }
}

// Save scheduled closures to file
async function saveScheduledClosures(logger) {
  try {
    await fs.writeFile(scheduledClosuresPath, JSON.stringify(scheduledClosures, null, 2));
    logger.info('Saved scheduled closures successfully');
  } catch (err) {
    logger.error('Failed to save scheduled closures:', err);
  }
}

// Helper: Parse delay string to milliseconds
function parseDelayString(input) {
  if (!input || typeof input !== 'string') return null;
  input = input.toLowerCase().trim();
  const regex = /(\d+)\s*(y|yr|year|years|mon|month|months|w|week|weeks|d|day|days|h|hr|hour|hours|m|min|minute|minutes|s|sec|second|seconds)/g;
  let totalMs = 0;
  let match;
  const unitMs = {
    y: 365 * 24 * 60 * 60 * 1000,
    yr: 365 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000,
    mon: 30 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
  };
  while ((match = regex.exec(input)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    if (!unitMs[unit]) return null;
    totalMs += value * unitMs[unit];
  }
  return totalMs || null;
}

// Schedule closure function
async function scheduleClosure(thread, reason, requestedBy, delayMs, logger, staffId) {
  setTimeout(async () => {
    try {
      const currentThread = await thread.fetch();
      if (currentThread.archived || currentThread.locked) return;

      await handleStaffClosure(null, currentThread, currentThread.id, logger, reason, 0, requestedBy, staffId);

      // Remove from scheduled closures
      delete scheduledClosures[thread.id];
      await saveScheduledClosures(logger);

      logger.info(`Scheduled closure completed for ticket ${thread.name}`);
    } catch (closureError) {
      logger.error('Error in scheduled ticket closure:', closureError);
    }
  }, delayMs);
}

async function executeCloseRequestCommand(interaction, logger, reason, delayStr) {
  try {
    if (!interaction.channel.isThread()) {
      await interaction.reply({
        content: config.messages.errors.notThread,
        ephemeral: true
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(config.bot.staffRoleId)) {
      await interaction.reply({
        content: 'Only staff members can request ticket closure.',
        ephemeral: true
      });
      return;
    }

    const thread = interaction.channel;
    reason = reason || 'No reason provided';

    const starterMessage = await thread.fetchStarterMessage().catch(error => {
      logger.error('Failed to fetch starter message:', error);
      return null;
    });

    if (!starterMessage) {
      await interaction.reply({
        content: 'Could not find the original ticket message.',
        ephemeral: true
      });
      return;
    }

    const ticketCreator = starterMessage.author;

    let delayMs = null;
    if (delayStr) {
      delayMs = parseDelayString(delayStr);
      if (delayMs === null) {
        await interaction.reply({
          content: 'Invalid delay format. Use formats like "1d 2h 30m" or "15m".',
          ephemeral: true
        });
        return;
      }
    }

    const closeButton = new ButtonBuilder()
      .setCustomId('close_request_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
      .addComponents(closeButton);

    if (delayMs) {
      const closeTime = Date.now() + delayMs;
      const closeDate = new Date(closeTime).toLocaleString();

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Scheduled Ticket Closure')
        .setDescription(`This ticket has been scheduled for closure in ${delayStr}.`)
        .addFields(
          { name: 'Scheduled Close Time', value: closeDate },
          { name: 'Reason', value: `\`\`\`\n${reason}\n\`\`\`` },
          { name: 'Requested By', value: interaction.user.tag }
        )
        .setTimestamp();

      await interaction.reply({
        content: `${ticketCreator}, this ticket will be automatically closed at the scheduled time. Staff can still close it immediately using the button below.`,
        embeds: [embed],
        components: [row]
      });

      await sendModLog(interaction.guild, {
        title: 'Ticket Closure Scheduled',
        description: `Ticket "${thread.name}" scheduled for closure.`,
        fields: [
          { name: 'Staff Member', value: interaction.user.tag },
          { name: 'Close Time', value: closeDate },
          { name: 'Reason', value: reason }
        ]
      });

      scheduledClosures[thread.id] = {
        threadId: thread.id,
        closeTime,
        reason,
        requestedBy: interaction.user.tag,
        staffId: interaction.user.id
      };
      await saveScheduledClosures(logger);

      scheduleClosure(thread, reason, interaction.user.tag, delayMs, logger, interaction.user.id);

      logger.info(`Scheduled closure set for ticket ${thread.name} by ${interaction.user.tag}`);
    } else {
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Ticket Closure Request')
        .setDescription('A staff member has requested this ticket to be closed.')
        .addFields(
          {
            name: 'Next Step',
            value: `If your issue has been resolved, please use the button below to close this ticket.`
          },
          { name: 'Reason', value: `\`\`\`\n${reason}\n\`\`\`` },
        )
        .setTimestamp();

      await interaction.reply({
        content: `${ticketCreator}, please review this ticket closure request.`,
        embeds: [embed],
        components: [row]
      });

      logger.info(`Close request sent for ticket ${thread.name} by ${interaction.user.tag}`);
    }
  } catch (error) {
    logger.error('Error handling close request command:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: 'An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
}

async function rescheduleClosures(client, logger) {
  for (const [threadId, closure] of Object.entries(scheduledClosures)) {
    const delayMs = closure.closeTime - Date.now();
    try {
      const thread = await client.channels.fetch(threadId);
      if (!thread) continue;

      if (delayMs <= 0) {
        logger.info(`Closure time passed for ticket ${thread.name}, closing now.`);
        await scheduleClosure(thread, closure.reason, closure.requestedBy, 0, logger, closure.staffId);
        delete scheduledClosures[threadId];
        await saveScheduledClosures(logger);
      } else {
        logger.info(`Rescheduling closure for ticket ${thread.name} in ${delayMs}ms`);
        scheduleClosure(thread, closure.reason, closure.requestedBy, delayMs, logger, closure.staffId);
      }
    } catch (e) {
      logger.error(`Error rescheduling ticket ${threadId}:`, e);
    }
  }
}

module.exports = {
  executeCloseRequestCommand,
  rescheduleClosures,
  handleSelectMenu
};