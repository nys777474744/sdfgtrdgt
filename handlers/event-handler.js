const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { sendModLog } = require('../utils/mod-log');
const { threadActivity, checkThreadInactivity, updateThreadActivity } = require('../utils/thread-activity');
const { handleSelectMenu, executeCloseCommand } = require('../commands/close');

function registerEventHandlers(client, dataManager, logger) {
  // Store dataManager in client for easy access in commands
  client.dataManager = dataManager;

  // Thread creation event
  client.on('threadCreate', async (thread) => {
    try {
      if (thread.parent?.id === config.bot.ticketChannelId) {
        // Wait for the starter message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const starterMessage = await thread.fetchStarterMessage().catch(() => null);
        if (!starterMessage) {
          logger.error('Could not find starter message for thread:', thread.id);
          return;
        }

        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
          .addComponents(closeButton);

        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('Welcome to Support!')
          .setDescription('Have you checked our forums for a solution? Many common issues are already answered there!\n\n**Forum:** https://forum.freeminecrafthost.com\n\nIf you haven\'t found your answer on the forums, don\'t worry! A staff member will assist you shortly.')
          .addFields(
            { 
              name: 'While You Wait', 
              value: 'Please provide as much detail as possible about your issue to help us assist you better.' 
            },
            { 
              name: 'Made This By Mistake?', 
              value: 'Use the button below to close the ticket or ping a staff member!' 
            },
            { 
              name: '🔒 How to Submit', 
              value: 'Please use the `/sensitive` command to securely submit the requested information.\nThis ensures your information is handled securely and only visible to staff members.' 
            },
            { 
              name: '⚠️ Important', 
              value: 'Do not post sensitive information directly in the chat.\nOnly use the `/sensitive` command to submit this information.' 
            }
          )
          .setTimestamp();

        await thread.send({
          content: `||<@&${config.bot.staffRoleId}>||`,
          embeds: [embed],
          components: [row]
        });

        // Initialize thread data
        dataManager.contributions.set(thread.id, new Set());
        await dataManager.saveData();

        await sendModLog(thread.guild, {
          title: 'New Support Ticket Created',
          description: `A new support ticket has been created: "${thread.name}"`,
          fields: [
            { name: 'Created By', value: thread.owner?.user?.tag || 'Unknown' },
            { name: 'Ticket ID', value: thread.id }
          ]
        });

        logger.info(`New forum post created: ${thread.name}`);

        // Initialize thread activity tracking
        threadActivity.set(thread.id, {
          lastActivity: Date.now(),
          reminded: false
        });

        checkThreadInactivity(thread, logger);
      }
    } catch (error) {
      logger.error('Error handling thread creation:', error);
    }
  });

  // Message creation event
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      if (message.channel.isThread()) {
        updateThreadActivity(message.channel.id);

        const member = await message.guild.members.fetch(message.author.id);
        if (member.roles.cache.has(config.bot.staffRoleId)) {
          await dataManager.addContribution(message.channel.id, member.id);
          logger.info(`${member.displayName} contributed to ${message.channel.name}`);
        }
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  });

  // Interaction event for buttons, select menus, and modals
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_contributors') {
          await handleSelectMenu(interaction, dataManager, logger);
        }
      }

      if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket' || interaction.customId === 'close_request_ticket') {
          const thread = interaction.channel;
          if (!thread.isThread()) {
            await interaction.reply({
              content: 'This command can only be used in ticket threads.',
              ephemeral: true
            });
            return;
          }

          const starterMessage = await thread.fetchStarterMessage().catch(() => null);
          const isTicketCreator = starterMessage && starterMessage.author.id === interaction.user.id;
          const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
          
          if (!member) {
            await interaction.reply({
              content: 'Unable to verify your permissions. Please try again.',
              ephemeral: true
            });
            return;
          }

          const isStaff = member.roles.cache.has(config.bot.staffRoleId);

          if (!isStaff && !isTicketCreator) {
            await interaction.reply({ 
              content: 'Sorry, only the ticket creator or staff members can close this ticket.',
              ephemeral: true 
            });
            return;
          }

          try {
            if (isStaff) {
              // Staff gets direct close with points
              await executeCloseCommand(interaction, dataManager, logger);
            } else {
              // Show staff selection for ticket creator
              const staffContributors = Array.from(dataManager.contributions.get(thread.id) || new Set());
              
              // If no staff contributed, allow direct close
              if (staffContributors.length === 0) {
                const embed = new EmbedBuilder()
                  .setColor(config.colors.success)
                  .setTitle('Ticket Closed')
                  .setDescription('Your ticket has been closed. Thank you for using our support system!')
                  .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await thread.setLocked(true);
                
                await sendModLog(interaction.guild, {
                  title: 'Ticket Closed by Creator',
                  description: `Ticket "${thread.name}" was closed by the ticket creator with no staff contribution.`,
                  fields: [
                    { name: 'Ticket Creator', value: interaction.user.tag },
                    { name: 'Ticket ID', value: thread.id }
                  ]
                });

                const archiveEmbed = new EmbedBuilder()
                  .setColor(config.colors.primary)
                  .setDescription('This ticket has been closed and will be archived.')
                  .setTimestamp();

                await thread.send({ embeds: [archiveEmbed] });
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

                return;
              }
              
              // Get all staff members in the server
              const staffRole = await interaction.guild.roles.fetch(config.bot.staffRoleId);
              const allStaffMembers = Array.from(staffRole.members.values());
              
              // Use staff contributors if available, otherwise use all staff
              const staffToShow = staffContributors.length > 0 ? staffContributors : allStaffMembers.map(m => m.id);
              
              const memberDetails = await Promise.all(
                staffToShow.map(async (id) => {
                  try {
                    const member = typeof id === 'string' ? await interaction.guild.members.fetch(id) : id;
                    return {
                      id: member.id,
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
                await interaction.reply({ 
                  content: 'Unable to find any staff members. Please contact a server administrator.',
                  ephemeral: true 
                });
                return;
              }

              const row = new ActionRowBuilder()
                .addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId('select_contributors')
                    .setPlaceholder('Select staff who helped you')
                    .setMinValues(1)
                    .setMaxValues(Math.min(validMembers.length, 25)) // Discord has a max of 25 selections
                    .addOptions(
                      validMembers.map((member) => ({
                        label: member.username,
                        value: member.id,
                      }))
                    )
                );

              const content = staffContributors.length > 0
                ? 'Please select the staff members who helped resolve your issue:'
                : 'Please select which staff members were most helpful (if any):';

              await interaction.reply({
                content: content,
                components: [row],
                ephemeral: true,
              });
            }
          } catch (err) {
            logger.error('Error handling close button:', err);
            await interaction.reply({
              content: 'An error occurred while processing your request. Please try again or contact a staff member.',
              ephemeral: true
            });
          }
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'staff_close_modal') {
          const reason = interaction.fields.getTextInputValue('close_reason');
          interaction.options = {
            getString: () => reason
          };
          await executeCloseCommand(interaction, dataManager, logger);
        }
      }
    } catch (err) {
      logger.error('Error handling interaction:', err);
      if (!interaction.replied) {
        await interaction.reply({ 
          content: 'An error occurred while processing this interaction.',
          ephemeral: true 
        });
      }
    }
  });

  // Bot ready log
  client.once('ready', () => {
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
  });
}

module.exports = { registerEventHandlers };