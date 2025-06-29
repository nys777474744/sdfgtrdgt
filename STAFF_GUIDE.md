# FMH Support Bot - Staff Guide

## Overview
This guide explains how to use the FMH Support Bot effectively as a staff member. The bot helps manage support tickets, track contributions, and provide quick responses to common questions.

## Commands

### 📝 Ticket Management

#### `/close`
- **Usage**: `/close [reason]`
- **Description**: Closes a ticket directly
- **Options**:
  - `reason`: Optional reason for closing the ticket
- **Note**: When you close a ticket, you get credit for helping

#### `/closerequest`
- **Usage**: `/closerequest [reason] [delay]`
- **Description**: Requests the ticket creator to close the ticket
- **Options**:
  - `reason`: Optional reason for the closure request
  - `delay`: Optional time delay (e.g., "1d 2h 30m")
- **Example**: `/closerequest "Issue resolved - please close if you're satisfied" "1d"`

#### `/check`
- **Usage**: `/check`
- **Description**: Shows which staff members have contributed to the current ticket
- **Note**: Use this to see who's already helped with a ticket

### 📚 FAQ Responses

#### `/faq`
- **Usage**: `/faq [topic]`
- **Description**: Sends a pre-written response for common questions
- **Available Topics**:
  - `create_server`: How to create a server
  - `forge_version`: How to change Forge version
  - `clicker_app`: How to run FMH Clicker on PC
  - `coins`: About server coins
  - `cracked`: How to allow cracked users
  - `add_mods`: How to add mods
  - `mod_website`: Where to download mods
  - `whitelist`: How to manage whitelist
  - `install_plugins`: How to install plugins
  - `change_world`: How to change world
  - `player_stats`: How to reset player stats
  - `nether_or_end`: How to reset dimensions
  - `invites`: Member invites verification

### 📊 Quota System

#### `/startquota`
- **Usage**: `/startquota [amount] [reset]`
- **Description**: Starts or resets monthly quota tracking
- **Options**:
  - `amount`: Monthly quota target
  - `reset`: Whether to reset current progress

#### `/endquota`
- **Usage**: `/endquota`
- **Description**: Ends the current quota period and saves results

#### `/quotastats`
- **Usage**: `/quotastats`
- **Description**: View current quota statistics for all staff

#### `/quotahistory`
- **Usage**: `/quotahistory`
- **Description**: View history of completed quota periods

### 👥 Contributions

#### `/contributions`
- **Usage**: `/contributions`
- **Description**: View all contributions from staff members

## Best Practices

### Ticket Handling
1. **Initial Response**:
   - Always acknowledge the ticket promptly
   - Use appropriate FAQ commands if applicable
   - Ask for clarification if needed

2. **During Support**:
   - Stay in the ticket while helping
   - Use clear, simple explanations
   - Verify the issue is resolved before closing

3. **Closing Tickets**:
   - Ask if the user needs anything else
   - Use `/closerequest` to let users close themselves
   - Use `/close` only when certain the issue is resolved

### Using FAQ Responses
- Always read the FAQ content before sending
- Add additional context if needed
- Follow up to ensure the FAQ answered their question

### Quota Management
- Keep track of your monthly quota progress
- Help other staff members reach their quotas
- Check `/quotastats` regularly to monitor progress

## Important Notes

### Ticket Auto-Closing
- Tickets may auto-close after extended inactivity
- Users are notified before auto-closure
- Staff can prevent auto-closure by sending a message

### User Permissions
- Regular users can only close their own tickets
- Users must select contributing staff when closing
- Staff can close any ticket directly

### Contribution Tracking
- Contributing to a ticket = sending a message
- Multiple messages in one ticket count as one contribution
- Contributions are tracked for quota purposes

## Need Help?
If you need assistance with the bot or have suggestions for improvements, please contact a senior staff member or administrator.

## Updates
This guide will be updated as new features are added to the bot. Check back regularly for any changes. 