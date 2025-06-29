require('dotenv').config();
const { GatewayIntentBits, Partials, ActivityType } = require('discord.js');

const config = {
  bot: {
    token: process.env.BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    staffRoleId: process.env.STAFF_ROLE_ID,
    announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID,
    modLogChannelId: process.env.MOD_LOG_CHANNEL_ID,
    ticketChannelId: process.env.TICKET_CHANNEL_ID
  },
  api: {
    port: process.env.API_PORT || 3000,
    enabled: process.env.ENABLE_API !== 'false' // Default to enabled
  },
  roles: {
    staff: process.env.STAFF_ROLE_ID,
    admin: process.env.ADMIN_ROLE_ID
  },
  client: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
  },
  paths: {
    data: './data.json'
  },
  colors: {
    primary: '#0099FF',
    success: '#00FF00',
    error: '#FF0000'
  },
  messages: {
    ticketCreated: 'Thank you for contacting support! A staff member will assist you shortly.',
    ticketClosed: 'This ticket has been closed. Thank you for reaching out!',
    errors: {
      generic: 'An unexpected error occurred. Please try again later.',
      notThread: 'This command can only be used within a support ticket thread.',
      noStaff: 'No staff members have contributed to this ticket.',
      noValidStaff: 'No valid staff members available for selection.',
      notTicketCreator: 'Only the ticket creator can close this ticket.'
    }
  },
  closeDelays: {
    '15m': {
      ms: 15 * 60 * 1000,
      label: '15 minutes'
    },
    '1h': {
      ms: 60 * 60 * 1000,
      label: '1 hour'
    },
    '1d': {
      ms: 24 * 60 * 60 * 1000,
      label: '1 day'
    },
    '1w': {
      ms: 7 * 24 * 60 * 60 * 1000,
      label: '1 week'
    }
  },
  inactivityPeriods: {
    '1d': {
      ms: 24 * 60 * 60 * 1000,
      label: '1 day'
    },
    '5d': {
      ms: 5 * 24 * 60 * 60 * 1000,
      label: '5 days'
    },
    '1w': {
      ms: 7 * 24 * 60 * 60 * 1000,
      label: '1 week'
    },
    '5w': {
      ms: 35 * 24 * 60 * 60 * 1000,
      label: '5 weeks'
    },
    '1m': {
      ms: 30 * 24 * 60 * 60 * 1000,
      label: '1 month'
    }
  },
  quotaResetDay: 1,
  presenceStatuses: [
    {
      type: 'PLAYING',
      name: 'Creating new world...',
      status: 'dnd'
    },
    {
      type: 'PLAYING',
      name: 'Mining diamonds',
      status: 'online'
    },
    {
      type: 'WATCHING',
      name: 'freeminecrafthost.com',
      status: 'online'
    },
    {
      type: 'PLAYING',
      name: 'Fighting the Ender Dragon',
      status: 'online'
    },
    {
      type: 'PLAYING',
      name: 'Building a redstone computer',
      status: 'online'
    },
    {
      type: 'PLAYING',
      name: 'Exploring the Nether',
      status: 'idle'
    },
    {
      type: 'PLAYING',
      name: 'Crafting items',
      status: 'online'
    },
    {
      type: 'PLAYING',
      name: 'Enchanting tools',
      status: 'online'
    },
    {
      type: 'PLAYING',
      name: 'Trading with villagers',
      status: 'online'
    },
    {
      type: 'PLAYING',
      name: 'Raiding an ocean monument',
      status: 'dnd'
    }
  ],
  inactivityTimeout: 24 * 60 * 60 * 1000
};

module.exports = config;