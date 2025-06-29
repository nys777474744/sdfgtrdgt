const { ActivityType } = require('discord.js');
const config = require('../config');

function setupPresenceRotation(client) {
  const statuses = config.presenceStatuses;
  let currentIndex = 0;

  setInterval(() => {
    const status = statuses[currentIndex];
    client.user.setPresence({
      activities: [{
        name: status.name,
        type: ActivityType[status.type]
      }],
      status: status.status
    });
    
    currentIndex = (currentIndex + 1) % statuses.length;
  }, 10000); // Change every 10 seconds
}

module.exports = { setupPresenceRotation };