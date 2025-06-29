const config = require('../config');
const { EmbedBuilder } = require('discord.js');

// Store thread activity data
const threadActivity = new Map();

// Check thread inactivity and send reminders
async function checkThreadInactivity(thread, logger) {
  try {
    const checkInactivity = async () => {
      try {
        const activity = threadActivity.get(thread.id);
        if (!activity) return;

        // Try to fetch the thread to see if it still exists
        const currentThread = await thread.fetch().catch(() => null);
        if (!currentThread) {
          // Thread no longer exists, clean up
          threadActivity.delete(thread.id);
          return;
        }

        if (currentThread.archived || currentThread.locked) {
          threadActivity.delete(thread.id);
          return;
        }

        const timeSinceLastActivity = Date.now() - activity.lastActivity;
        
        // Only send reminder once after specified inactivity period
        if (timeSinceLastActivity >= config.inactivityTimeout && !activity.reminded) {
          const starterMessage = await currentThread.fetchStarterMessage().catch(() => null);
          if (starterMessage) {
            const embed = new EmbedBuilder()
              .setColor(config.colors.primary)
              .setTitle('Ticket Inactivity Notice')
              .setDescription('This ticket has been inactive for a day.')
              .addFields(
                { name: 'What to do?', value: 'If your issue has been resolved, please use the `/close` command to close this ticket. Otherwise, please provide an update.' }
              )
              .setTimestamp();

            await currentThread.send({
              content: `${starterMessage.author}, `,
              embeds: [embed]
            });

            activity.reminded = true;
            logger.info(`Inactivity reminder sent for thread ${currentThread.name}`);
          }
        }

        setTimeout(checkInactivity, 60000); // Check every minute
      } catch (error) {
        // If we get a 404/unknown channel error, clean up the thread activity
        if (error.code === 10003) {
          threadActivity.delete(thread.id);
          return;
        }
        logger.error('Error in checkInactivity interval:', error);
      }
    };

    setTimeout(checkInactivity, 60000);
  } catch (error) {
    logger.error('Error in checkThreadInactivity:', error);
  }
}

// Update thread activity timestamp
function updateThreadActivity(threadId) {
  const activity = threadActivity.get(threadId);
  if (activity) {
    activity.lastActivity = Date.now();
    activity.reminded = false;
  } else {
    threadActivity.set(threadId, {
      lastActivity: Date.now(),
      reminded: false
    });
  }
}

module.exports = {
  threadActivity,
  checkThreadInactivity,
  updateThreadActivity
};