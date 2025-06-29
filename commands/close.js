const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { sendModLog } = require('../utils/mod-log');

async function handleStaffClosure(interactionOrNull, thread, threadId, logger, reason, delay, closedBy = 'System', staffId = null) {
  try {
    if (delay) {
      const ms = parseInt(delay, 10);
      if (!isNaN(ms) && ms > 0) {
        if (interactionOrNull) {
          await interactionOrNull.reply({ content: `Ticket will close in ${ms / 1000} seconds...`, ephemeral: true });
        }
        await new Promise(resolve => setTimeout(resolve, ms));
      }
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Ticket Closed by Staff')
      .setDescription(`${config.messages.ticketClosed}`)
      .setTimestamp();

    if (interactionOrNull) {
      if (interactionOrNull.replied || interactionOrNull.deferred) {
        await interactionOrNull.followUp({ embeds: [embed] });
      } else {
        await interactionOrNull.reply({ embeds: [embed] });
      }
    } else {
      await thread.send({ embeds: [embed] });
    }

    await thread.setLocked(true);

    const archiveEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setDescription('This ticket has been closed and will be archived.')
      .setTimestamp();

    await thread.send({ embeds: [archiveEmbed] });

    await sendModLog(thread.guild, {
      title: 'Ticket Closed by System',
      description: `Ticket "${thread.name}" was automatically closed.`,
      color: config.colors.error,
      fields: [
        { name: 'Initiator', value: closedBy },
        { name: 'Reason', value: reason || 'No reason provided' },
        { name: 'Ticket ID', value: threadId }
      ]
    });

    // Award point to staff member who requested the closure
    if (staffId) {
      const dataManager = thread.client.dataManager;
      await dataManager.closeTicket(threadId, [staffId]);
    }

    await thread.setArchived(true);

    try {
      const appliedTags = thread.appliedTags || [];
      const forum = thread.parent;

      if (forum && forum.availableTags) {
        const solvedTag = forum.availableTags.find(tag =>
          ['solved', 'closed'].includes(tag.name.toLowerCase())
        );

        if (solvedTag && !appliedTags.includes(solvedTag.id)) {
          const newTags = [...new Set([...appliedTags, solvedTag.id])];
          await thread.setAppliedTags(newTags);
        }
      }
    } catch (error) {
      logger.error('Error applying solved tag:', error);
    }

    logger.info(`Ticket ${thread.name} has been force-closed by ${closedBy}`);
  } catch (error) {
    logger.error('Error in handleStaffClosure:', error);
    throw error;
  }
}

async function executeCloseCommand(interaction, dataManager, logger, options = {}) {
  try {
    if (!interaction.channel.isThread()) {
      await interaction.reply({ content: config.messages.errors.notThread, ephemeral: true });
      return;
    }

    const thread = interaction.channel;
    const threadId = thread.id;
    const staffContributors = Array.from(dataManager.contributions.get(threadId) || new Set());

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isStaff = member.roles.cache.has(config.bot.staffRoleId);

    const starterMessage = await thread.fetchStarterMessage().catch(() => null);
    const isTicketCreator = starterMessage && starterMessage.author.id === interaction.user.id;

    if (!isStaff && !isTicketCreator) {
      await interaction.reply({ content: 'Only staff members or the ticket creator can close this ticket.', ephemeral: true });
      return;
    }

    if (staffContributors.length === 0) {
      await interaction.reply({ content: config.messages.errors.noStaff, ephemeral: true });
      return;
    }

    // Optional reason and delay
    const reason = options.reason ?? interaction.options?.getString('reason');
    const delay = options.delay ?? interaction.options?.getString('delay');

    if (isStaff) {
      // Staff can close without reason/delay
      await handleStaffClosure(interaction, thread, threadId, logger, reason, delay);
      return;
    }

    // Ticket creator: select contributing staff
    const memberDetails = await Promise.all(
      staffContributors.map(async (id) => {
        try {
          const member = await interaction.guild.members.fetch(id);
          return {
            id,
            username: member.user.username,
          };
        } catch (err) {
          logger.error(`Error fetching member ${id}:`, err);
          return null;
        }
      })
    );

    const validMembers = memberDetails.filter(m => m !== null);
    if (validMembers.length === 0) {
      await interaction.reply({ content: config.messages.errors.noValidStaff, ephemeral: true });
      return;
    }

    const optionsMenu = validMembers.map((member) => ({
      label: member.username,
      value: member.id,
    }));

    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_contributors')
          .setPlaceholder('Select staff who contributed')
          .setMinValues(1)
          .setMaxValues(optionsMenu.length)
          .addOptions(optionsMenu.slice(0, 25))
      );

    await interaction.reply({
      content: 'Select all staff who helped resolve your issue:',
      components: [row],
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Error executing close command:', error);
    throw error;
  }
}

async function handleSelectMenu(interaction, dataManager, logger) {
  try {
    const threadId = interaction.channel.id;
    const selectedStaffIds = interaction.values;

    // Acknowledge the interaction first
    await interaction.deferUpdate();

    // Process the ticket closure
    await dataManager.closeTicket(threadId, selectedStaffIds);

    const staffNames = await Promise.all(
      selectedStaffIds.map(async (id) => {
        try {
          const member = await interaction.guild.members.fetch(id);
          return member.user.username;
        } catch {
          return `User ID: ${id}`;
        }
      })
    );

    const closureEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Ticket Closed')
      .setDescription(`${config.messages.ticketClosed}\nStaff who contributed: ${staffNames.join(', ')}.`)
      .setTimestamp();

    // Send a new message instead of editing the reply
    await interaction.channel.send({
      embeds: [closureEmbed]
    });

    const thread = interaction.channel;
    await thread.setLocked(true);

    await sendModLog(interaction.guild, {
      title: 'Ticket Closed by User',
      description: `Ticket "${thread.name}" was closed by the ticket creator.`,
      fields: [
        { name: 'Ticket Creator', value: interaction.user.tag },
        { name: 'Contributing Staff', value: staffNames.join(', ') },
        { name: 'Ticket ID', value: threadId }
      ]
    });

    const archiveEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setDescription('This ticket has been closed and will be archived.')
      .setTimestamp();

    await thread.send({ embeds: [archiveEmbed] });

    try {
      const appliedTags = thread.appliedTags || [];
      const forum = thread.parent;

      if (forum && forum.availableTags) {
        const solvedTag = forum.availableTags.find(tag =>
          tag.name.toLowerCase() === 'solved' ||
          tag.name.toLowerCase() === 'closed'
        );

        if (solvedTag) {
          const newTags = [...new Set([...appliedTags, solvedTag.id])];
          await thread.setAppliedTags(newTags);
        }
      }
    } catch (error) {
      logger.error('Error applying solved tag:', error);
    }

    // Archive the thread last
    await thread.setArchived(true);

    logger.info(`Ticket ${thread.name} has been closed, locked, and archived`);
  } catch (error) {
    logger.error('Error handling select menu:', error);
    // Try to send an error message to the channel if possible
    try {
      await interaction.channel.send({
        content: 'An error occurred while closing the ticket. Please try again or contact an administrator.',
        ephemeral: true
      });
    } catch (e) {
      logger.error('Failed to send error message:', e);
    }
    throw error;
  }
}

module.exports = {
  executeCloseCommand,
  handleSelectMenu,
  handleStaffClosure
};