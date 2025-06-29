const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { inviteTracker } = require('../utils/inviteTracker');
const config = require('../config');

// Store verification states
const verificationStates = new Map();

async function executeVerifyCommand(interaction, logger) {
    try {
        // Check if user has staff role
        const hasStaffRole = interaction.member.roles.cache.has(config.bot.staffRoleId);
        if (!hasStaffRole) {
            return await interaction.reply({
                content: 'Only staff members can use this command.',
                ephemeral: true
            });
        }

        // Get the user to verify
        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return await interaction.reply({
                content: 'Could not find that user in the server.',
                ephemeral: true
            });
        }

        // Get invite statistics using the global invite tracker
        const inviteStats = await inviteTracker.getInviterStats(interaction.guild, targetUser.id);
        
        if (!inviteStats) {
            return await interaction.reply({
                content: 'Could not fetch invite statistics.',
                ephemeral: true
            });
        }

        // Create verification embed with detailed statistics
        const verifyEmbed = new EmbedBuilder()
            .setTitle('🔍 Detailed Invite Verification Check')
            .setDescription(`Verifying User: ${targetUser.tag}\nRequested by: ${interaction.user.tag}`)
            .addFields(
                {
                    name: '👤 User Information',
                    value: [
                        `Account Created: <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
                        `Joined Server: <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
                        `Roles: ${targetMember.roles.cache.size - 1} roles`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 Invite Statistics',
                    value: `${targetUser.username} currently has ${inviteStats.total} invites. (${inviteStats.regular} regular, ${inviteStats.left} left, ${inviteStats.fake} fake)`,
                    inline: false
                },
                {
                    name: '❌ Fake Invite Criteria',
                    value: [
                        '• Account less than 7 days old when joined',
                        '• Account created and joined within 1 hour',
                        '• Member left within 24 hours of joining'
                    ].join('\n'),
                    inline: false
                }
            )
            .setColor(getVerificationColor(inviteStats.total, inviteStats.left, inviteStats.fake))
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        // Create start verification button
        const startButton = new ButtonBuilder()
            .setCustomId(`verify_start:${targetUser.id}`)
            .setLabel('Start 3-Day Verification')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✅');

        const row = new ActionRowBuilder()
            .addComponents(startButton);

        // Send the embed with button
        await interaction.reply({
            embeds: [verifyEmbed],
            components: [row]
        });

    } catch (error) {
        logger.error('Error in verify command:', error);
        await interaction.reply({
            content: 'There was an error executing the verify command.',
            ephemeral: true
        }).catch(() => {});
    }
}

// Helper function to determine embed color based on verification stats
function getVerificationColor(effective, left, fake) {
    if (effective <= 0) return 0x808080; // Gray for no/negative invites
    if (effective > 50) return 0x00FF00; // Green for lots of invites
    if (effective > 20) return 0xFFAA00; // Orange for moderate invites
    return 0xFF0000; // Red for few invites
}

async function handleVerifyButton(interaction, logger) {
    try {
        // Check if user has staff role
        const hasStaffRole = interaction.member.roles.cache.has(config.bot.staffRoleId);
        if (!hasStaffRole) {
            return await interaction.reply({
                content: 'Only staff members can start verification.',
                ephemeral: true
            });
        }

        // Check if the customId starts with verify_start
        if (!interaction.customId.startsWith('verify_start:')) {
            return;
        }

        // Get the target user ID from the button custom ID
        const targetUserId = interaction.customId.split(':')[1];
        const targetUser = await interaction.guild.members.fetch(targetUserId).catch(() => null);

        if (!targetUser) {
            return await interaction.reply({
                content: 'Could not find the user being verified.',
                ephemeral: true
            });
        }

        // Set verification state
        const verificationEndTime = Date.now() + (3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds
        verificationStates.set(interaction.message.id, {
            staffId: interaction.user.id,
            targetUserId: targetUser.id,
            startTime: Date.now(),
            endTime: verificationEndTime,
            messageId: interaction.message.id,
            channelId: interaction.channel.id
        });

        // Update the embed
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
            .addFields({
                name: '⏳ Verification Status',
                value: [
                    `Started by: ${interaction.user.tag}`,
                    `Verifying: ${targetUser.user.tag}`,
                    `Ends: <t:${Math.floor(verificationEndTime / 1000)}:R>`
                ].join('\n')
            });

        // Disable the button
        const disabledButton = new ButtonBuilder()
            .setCustomId(`verify_start:${targetUser.id}`)
            .setLabel('Verification In Progress')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏳')
            .setDisabled(true);

        const row = new ActionRowBuilder()
            .addComponents(disabledButton);

        // Update the message
        await interaction.update({
            embeds: [updatedEmbed],
            components: [row]
        });

        // Schedule notification after 3 days
        setTimeout(async () => {
            try {
                const verificationState = verificationStates.get(interaction.message.id);
                if (!verificationState) return;

                const guild = interaction.guild;
                
                // Get final invite statistics using the global invite tracker
                const finalStats = await inviteTracker.getInviterStats(guild, verificationState.targetUserId);
                
                if (!finalStats) {
                    logger.error('Could not fetch final invite statistics');
                    return;
                }

                const targetUser = await guild.members.fetch(verificationState.targetUserId).catch(() => null);
                
                if (!targetUser) {
                    logger.error('Target user not found for verification completion');
                    return;
                }

                // Create completion embed with updated statistics
                const completionEmbed = new EmbedBuilder()
                    .setTitle('🕒 Verification Period Ended')
                    .setDescription(`Verification period has ended for ${targetUser.user.tag}`)
                    .addFields(
                        {
                            name: '📊 Final Statistics',
                            value: `You currently have ${finalStats.total} invites. (${finalStats.regular} regular, ${finalStats.left} left, ${finalStats.fake} fake)`,
                            inline: false
                        }
                    )
                    .setColor(getVerificationColor(finalStats.total, finalStats.left, finalStats.fake))
                    .setThumbnail(targetUser.user.displayAvatarURL())
                    .setTimestamp();

                // Send notification to the original channel
                const channel = await guild.channels.fetch(verificationState.channelId).catch(() => null);
                if (channel) {
                    await channel.send({
                        content: `<@${verificationState.staffId}>, verification period has ended for <@${verificationState.targetUserId}>`,
                        embeds: [completionEmbed]
                    }).catch((error) => {
                        logger.error('Error sending verification completion notification:', error);
                    });
                }

                // Clean up verification state
                verificationStates.delete(interaction.message.id);
            } catch (error) {
                logger.error('Error sending verification completion notification:', error);
            }
        }, 3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds

        logger.info(`Verification started by ${interaction.user.tag} for ${targetUser.user.tag}`);
    } catch (error) {
        logger.error('Error handling verify button:', error);
        await interaction.reply({
            content: 'There was an error starting the verification process.',
            ephemeral: true
        }).catch(() => {});
    }
}

module.exports = { 
    executeVerifyCommand,
    handleVerifyButton
}; 