# Discord Support Bot with Data API

A comprehensive Discord bot for managing support tickets with an integrated API server for sharing data across multiple servers.

## Features

### Discord Bot Features
- **Ticket Management**: Create, close, and track support tickets
- **Staff Contributions**: Track which staff members help with tickets
- **Quota System**: Set and monitor monthly ticket quotas for staff
- **FAQ System**: Quick responses to common questions
- **Priority & Category System**: Organize tickets by priority and category
- **Invite Verification**: Track and verify member invites
- **Auto-moderation**: Automatic ticket closure for inactive tickets

### Data API Features
- **RESTful API**: Access bot data via HTTP endpoints
- **Cross-Server Sync**: Sync data between multiple Discord servers
- **Real-time Data**: Always up-to-date information
- **Secure Access**: CORS-enabled for controlled access

## Project Structure

```
project/
├── index.js              # Entry point
├── config.js             # Configuration settings
├── api/                  # API server
│   └── server.js         # Express API server
├── utils/                # Utility functions
│   ├── logger.js         # Winston logger setup
│   ├── data-manager.js   # Data management class
│   ├── api-client.js     # API client for syncing data
│   ├── presence.js       # Presence rotation
│   ├── cron-jobs.js      # Scheduled tasks
│   ├── mod-log.js        # Mod logging functionality
│   ├── thread-activity.js # Thread inactivity checking
│   ├── inviteTracker.js  # Invite tracking system
│   └── ticket-features.js # Ticket priority/category system
├── handlers/             # Event handlers
│   ├── command-handler.js  # Command processing logic
│   └── event-handler.js    # Discord client event handling
├── commands/             # Command implementations
│   ├── faq.js            # FAQ command
│   ├── close.js          # Close ticket command
│   ├── check.js          # Check ticket command
│   ├── contributions.js  # View contributions command
│   ├── closerequest.js   # Request closure command
│   ├── sync-data.js      # Data synchronization command
│   └── quota-commands.js # Quota-related commands
├── events/               # Discord event handlers
│   ├── ready.js          # Bot ready event
│   ├── guildMemberAdd.js # Member join tracking
│   └── guildMemberRemove.js # Member leave tracking
└── data/                 # Data files
    └── faq-responses.js  # FAQ response data
```

## API Endpoints

### Health Check
- `GET /health` - Check API server status

### Data Access
- `GET /api/data` - Get all bot data
- `GET /api/data/:section` - Get specific data section
- `GET /api/stats/staff` - Get formatted staff statistics
- `GET /api/quota` - Get quota information and history
- `GET /api/tickets/features` - Get ticket priorities and categories

### Documentation
- `GET /api/docs` - API documentation with examples

## Setup Instructions

### Environment Variables
Create a `.env` file with the following variables:

```env
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_discord_server_id
STAFF_ROLE_ID=your_staff_role_id
ANNOUNCEMENT_CHANNEL_ID=your_announcement_channel_id
MOD_LOG_CHANNEL_ID=your_mod_log_channel_id
TICKET_CHANNEL_ID=your_ticket_channel_id

# API Configuration
API_PORT=3000
ENABLE_API=true
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the bot:
```bash
npm start
```

The bot will start both the Discord client and the API server.

## Using the Data API

### Accessing Your Data
Once the bot is running, your data will be available at:
- `http://your-server-ip:3000/api/data` - All data
- `http://your-server-ip:3000/api/stats/staff` - Staff statistics
- `http://your-server-ip:3000/api/docs` - Full API documentation

### Syncing Data from Another Server
Use the `/syncdata` command in Discord:

```
/syncdata source_url:http://other-server:3000 data_type:staff_stats
```

Available data types:
- `all` - Sync all data
- `staff_stats` - Sync staff statistics only
- `quota_data` - Sync quota information
- `contributions` - Sync contribution records

### Example API Usage

#### JavaScript/Node.js
```javascript
const fetch = require('node-fetch');

async function getStaffStats() {
    const response = await fetch('http://your-server:3000/api/stats/staff');
    const data = await response.json();
    console.log(data);
}
```

#### Python
```python
import requests

response = requests.get('http://your-server:3000/api/stats/staff')
data = response.json()
print(data)
```

#### cURL
```bash
curl http://your-server:3000/api/stats/staff
```

## Discord Commands

### Staff Commands
- `/faq [topic]` - Send FAQ responses
- `/close [reason]` - Close tickets
- `/closerequest [reason] [delay]` - Request ticket closure
- `/priority [level] [reason]` - Set ticket priority
- `/category [type]` - Set ticket category
- `/contributions` - View staff contributions
- `/verify [user]` - Start invite verification

### Admin Commands
- `/startquota [amount] [reset]` - Start quota period
- `/endquota` - End quota period
- `/quotastats` - View quota statistics
- `/syncdata [source_url] [data_type]` - Sync data from another server
- `/debug` - View debug information

## Security Considerations

- The API server uses CORS to allow cross-origin requests
- Only GET requests are supported for data access
- No authentication is required (consider adding if needed)
- Data is read-only via the API
- Admin commands require Discord permissions

## Troubleshooting

### API Server Issues
- Check if port 3000 is available
- Verify firewall settings allow incoming connections
- Check logs for any startup errors

### Data Sync Issues
- Ensure source server API is accessible
- Verify URL format (include http:// or https://)
- Check network connectivity between servers

### Discord Bot Issues
- Verify bot token and permissions
- Check if all required channels exist
- Ensure bot has necessary Discord permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.