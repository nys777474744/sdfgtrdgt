require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { setupLogger } = require('./utils/logger');
const { registerEventHandlers } = require('./handlers/event-handler');
const { registerCommands } = require('./handlers/command-handler');
const { initializeDataManager } = require('./utils/data-manager');
const { setupCronJobs } = require('./utils/cron-jobs');
const { setupPresenceRotation } = require('./utils/presence');
const { DataAPIServer } = require('./api/server');
const config = require('./config');
const { initializeTicketFeatures } = require('./utils/ticket-features');

// Initialize logger
const logger = setupLogger();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

async function initialize() {
  try {
    // Set up client error handler
    client.on('error', (error) => {
      logger.error('Discord client error:', error);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled promise rejection:', error);
    });

    // Initialize data managers
    const dataManager = await initializeDataManager(logger);
    const ticketFeatures = await initializeTicketFeatures(logger);

    // Attach data managers to client for easy access
    client.dataManager = dataManager;
    client.ticketFeatures = ticketFeatures;

    // Start API server for data sharing
    const apiServer = new DataAPIServer(logger);
    apiServer.start();
    
    // Store API server reference for graceful shutdown
    client.apiServer = apiServer;

    // Register command handlers
    await registerCommands(client, logger);
    
    // Register event handlers
    registerEventHandlers(client, dataManager, logger);
    
    // Login to Discord
    await client.login(config.bot.token);
    
    // Setup presence rotation
    setupPresenceRotation(client);
    
    // Setup cron jobs
    setupCronJobs(client, dataManager, logger);
    
    logger.info('Bot successfully initialized and logged in');
    logger.info('API server is running and data.json is now accessible to other servers');
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  if (client.apiServer) {
    client.apiServer.stop();
  }
  
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  
  if (client.apiServer) {
    client.apiServer.stop();
  }
  
  client.destroy();
  process.exit(0);
});

// Start the bot
initialize();