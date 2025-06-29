const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { executeFaqCommand } = require('../commands/faq');
const { executeCloseCommand, handleSelectMenu } = require('../commands/close');
const { executeCheckCommand } = require('../commands/check');
const { executeContributionsCommand } = require('../commands/contributions');
const { executeCloseRequestCommand } = require('../commands/closerequest');
const { executePriorityCommand } = require('../commands/priority');
const { executeCategoryCommand } = require('../commands/category');
const { executeDebugCommand } = require('../commands/debug');
const { executeVerifyCommand, handleVerifyButton } = require('../commands/verify');
const { executeContributionRequestCommand, handleContributionResponse, processContributionRequest } = require('../commands/contributionrequest');
const { executeUserTicketsCommand } = require('../commands/usertickets');
const { execute: executeTicketStatsCommand } = require('../commands/ticketstats');
const { 
  executeStartQuotaCommand, 
  executeEndQuotaCommand,
  executeQuotaStatsCommand,
  executeQuotaHistoryCommand
} = require('../commands/quota-commands');

// Command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Send a FAQ response')
    .addStringOption(option =>
      option
        .setName('topic')
        .setDescription('Select the FAQ topic')
        .setRequired(true)
        .addChoices(
          { name: 'Create Server', value: 'create_server' },
          { name: 'Forge Version', value: 'forge_version' },
          { name: 'Clicker App', value: 'clicker_app' },
          { name: 'Server Coins', value: 'coins' },
          { name: 'Cracked/Offline Mode', value: 'cracked' },
          { name: 'Add Mods', value: 'add_mods' },
          { name: 'Mod Websites', value: 'mod_website' },
          { name: 'Enable Whitelist', value: 'whitelist' },
          { name: 'Install Plugins', value: 'install_plugins' },
          { name: 'Change World', value: 'change_world' },
          { name: 'Reset Player Stats', value: 'player_stats' },
          { name: 'Reset Nether/End', value: 'nether_or_end' },
          { name: 'Member Invites', value: 'invites' }
        )
    ),
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the support ticket.')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for closing the ticket (optional)')
        .setRequired(false)
    
    ),
  new SlashCommandBuilder()
    .setName('check')
    .setDescription('Check the status of a ticket.'),
  new SlashCommandBuilder()
    .setName('contributions')
    .setDescription('View all contributions from staff members.'),
  new SlashCommandBuilder()
  .setName('closerequest')
  .setDescription('Request the ticket creator to close the ticket.')
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for requesting ticket closure (optional)')
      .setRequired(false)
  )
  .addStringOption(option =>
  option
    .setName('delay')
    .setDescription('Optional delay before requesting closure (e.g., "1d 2h 30m")')
    .setRequired(false)
),

  new SlashCommandBuilder()
    .setName('startquota')
    .setDescription('Start or reset monthly quota tracking')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Monthly quota amount')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('reset')
        .setDescription('Reset all monthly stats (true) or keep current progress (false)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('endquota')
    .setDescription('End the current quota period and save results'),
  new SlashCommandBuilder()
    .setName('quotastats')
    .setDescription('View current quota statistics for all staff members'),
  new SlashCommandBuilder()
    .setName('quotahistory')
    .setDescription('View history of completed quota periods'),
  new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Set the priority level of a ticket')
    .addStringOption(option =>
      option
        .setName('level')
        .setDescription('Priority level')
        .setRequired(true)
        .addChoices(
          { name: '🔴 Urgent', value: 'urgent' },
          { name: '🟠 High', value: 'high' },
          { name: '🟢 Normal', value: 'normal' },
          { name: '⚪ Low', value: 'low' }
        )
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for setting this priority')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('category')
    .setDescription('Set the category of a ticket')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Ticket category')
        .setRequired(true)
        .addChoices(
          { name: '🖥️ Server', value: 'server' },
          { name: '💰 Coins', value: 'coins' },
        { name: '💰 Refund', value: 'refund' },
          { name: '🔌 Plugins', value: 'plugins' },
          { name: '⚡ Performance', value: 'performance' },
          { name: '📌 Other', value: 'other' }
        )
    ),
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Start the invite verification process')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to verify')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('contributionrequest')
    .setDescription('Request contribution points for a ticket you helped with')
    .addStringOption(option =>
      option
        .setName('creator')
        .setDescription('The username of the ticket creator')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Display debug information about the bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('tickets')
        .setDescription('Show debug information about the current ticket')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('quotas')
        .setDescription('Show debug information about quotas and staff stats')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Show system-wide statistics')
    ),
  new SlashCommandBuilder()
    .setName('usertickets')
    .setDescription('Search for all tickets created by a user')
    .addStringOption(option =>
      option
        .setName('username')
        .setDescription('The username to search for')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('ticketstats')
    .setDescription('View ticket statistics for different time periods'),
];


async function registerCommands(client, logger) {
  try {
    logger.info('Config values:', {
      token: config.bot.token ? 'Set' : 'Not set',
      clientId: config.bot.clientId,
      guildId: config.bot.guildId
    });
    const rest = new REST({ version: '10' }).setToken(config.bot.token);
    await rest.put(
      Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
      { body: commands }
    );
    logger.info('Successfully registered application commands');
    
    // Set up command handlers
    setupCommandHandlers(client, logger);
  } catch (error) {
    logger.error('Error registering commands:', error);
    throw error;
  }
}

function setupCommandHandlers(client, logger) {
  client.on('interactionCreate', async (interaction) => {
    try {
      const dataManager = client.dataManager;
      const ticketFeatures = client.ticketFeatures;
      
      if (interaction.isCommand()) {
        switch (interaction.commandName) {
          case 'faq':
            await executeFaqCommand(interaction, logger);
            break;
          case 'close':
            await executeCloseCommand(interaction, dataManager, logger);
            break;
          case 'check':
            await executeCheckCommand(interaction, dataManager);
            break;
          case 'contributions':
            await executeContributionsCommand(interaction, dataManager);
            break;
          case 'closerequest':
            const reason = interaction.options.getString('reason');
            const delay = interaction.options.getString('delay');
            await executeCloseRequestCommand(interaction, logger, reason, delay);            
            break;
          case 'startquota':
            await executeStartQuotaCommand(interaction, dataManager, logger);
            break;
          case 'endquota':
            await executeEndQuotaCommand(interaction, dataManager, logger);
            break;
          case 'quotastats':
            await executeQuotaStatsCommand(interaction, dataManager, logger);
            break;
          case 'quotahistory':
            await executeQuotaHistoryCommand(interaction, dataManager, logger);
            break;
          case 'priority':
            await executePriorityCommand(interaction, ticketFeatures, logger);
            break;
          case 'category':
            await executeCategoryCommand(interaction, ticketFeatures, logger);
            break;
          case 'verify':
            await executeVerifyCommand(interaction, logger);
            break;
          case 'contributionrequest':
            await executeContributionRequestCommand(interaction, dataManager, logger);
            break;
          case 'debug':
            await executeDebugCommand(interaction, dataManager, ticketFeatures, logger);
            break;
          case 'usertickets':
            await executeUserTicketsCommand(interaction, dataManager, logger);
            break;
          case 'ticketstats':
            await executeTicketStatsCommand(interaction, dataManager, logger);
            break;
          default:
            await interaction.reply({
              content: 'Unknown command',
              ephemeral: true
            });
        }
      } else if (interaction.isButton()) {
        if (interaction.customId.startsWith('contrib_yes_') || interaction.customId.startsWith('contrib_no_')) {
          await handleContributionResponse(interaction, dataManager, logger);
          return;
        }
        
        if (interaction.customId === 'close_ticket' || interaction.customId === 'close_request_ticket') {
          await handleVerifyButton(interaction, logger);
        }
      } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_contributors') {
          await handleSelectMenu(interaction, dataManager, logger);
        } else if (interaction.customId === 'select_ticket_for_contribution') {
          // Handle ticket selection for contribution request
          try {
            // Get the stored potential threads
            const potentialData = interaction.client.potentialContributionThreads.get(interaction.user.id);
            if (!potentialData) {
              await interaction.reply({
                content: 'Your selection has expired. Please try the command again.',
                ephemeral: true
              });
              return;
            }
            
            const selectedIndex = parseInt(interaction.values[0]);
            const selectedItem = potentialData.threads[selectedIndex];
            
            if (!selectedItem) {
              await interaction.reply({
                content: 'Invalid selection. Please try the command again.',
                ephemeral: true
              });
              return;
            }
            
            const { thread, creator } = selectedItem;
            const ticketId = thread.id;
            const staffId = interaction.user.id;
            const staffName = interaction.user.username;
            
            // Check if already credited
            const contributions = dataManager.contributions.get(ticketId) || new Set();
            if (contributions.has(staffId)) {
              await interaction.reply({ 
                content: 'You are already credited for contributing to this ticket.', 
                ephemeral: true 
              });
              return;
            }
            
            // Process the contribution request
            await interaction.deferUpdate();
            await processContributionRequest(
              interaction, ticketId, creator, thread.name, staffId, staffName, dataManager, logger
            );
            
            // Clean up
            interaction.client.potentialContributionThreads.delete(interaction.user.id);
          } catch (error) {
            logger.error('Error handling ticket selection:', error);
            await interaction.reply({
              content: 'An error occurred while processing your selection. Please try again.',
              ephemeral: true
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error handling interaction:', error);
      await handleInteractionError(interaction, error, logger);
    }
  });
}

async function handleInteractionError(interaction, error, logger) {
  try {
    if (!logger) {
      console.error('Logger not provided to handleInteractionError');
      logger = {
        error: console.error
      };
    }
    
    logger.error('Interaction error:', error);

    let errorMessage = config.messages.errors.generic;

    // Handle specific Discord API errors
    if (error.code) {
      switch (error.code) {
        case 10008: // Unknown Message
          errorMessage = "The message could not be found. It may have been deleted.";
          break;
        case 50001: // Missing Access
          errorMessage = "I don't have permission to perform this action.";
          break;
        case 50013: // Missing Permissions
          errorMessage = "I don't have the required permissions to do that.";
          break;
        case 50035: // Invalid Form Body
          errorMessage = "Invalid command usage. Please check the command parameters.";
          break;
      }
    }

    const errorEmbed = {
      color: parseInt(config.colors.error.replace('#', ''), 16),
      title: 'Error',
      description: errorMessage,
      timestamp: new Date()
    };

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    } else if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      try {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } catch (followUpError) {
        logger.error('Failed to send error follow-up:', followUpError);
      }
    }

    // Log additional context for debugging
    logger.error('Error Context:', {
      commandName: interaction.commandName,
      userId: interaction.user?.id,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      errorCode: error.code,
      errorMessage: error.message
    });
  } catch (handlingError) {
    logger.error('Error in error handler:', handlingError);
    logger.error('Original error:', error);
  }
}

module.exports = { 
  registerCommands,
  handleInteractionError
};