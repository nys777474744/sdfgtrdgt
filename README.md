
## Project Structure

```
project/
├── index.js              # Entry point
├── config.js             # Configuration settings
├── utils/                # Utility functions
│   ├── logger.js         # Winston logger setup
│   ├── data-manager.js   # Data management class
│   ├── presence.js       # Presence rotation
│   ├── cron-jobs.js      # Scheduled tasks
│   ├── mod-log.js        # Mod logging functionality
│   └── thread-activity.js # Thread inactivity checking
├── handlers/             # Event handlers
│   ├── command-handler.js  # Command processing logic
│   └── event-handler.js    # Discord client event handling
├── commands/             # Command implementations
│   ├── faq.js            # FAQ command
│   ├── close.js          # Close ticket command
│   ├── check.js          # Check ticket command
│   ├── contributions.js  # View contributions command
│   ├── requestclose.js   # Request closure command
│   └── quota-commands.js # Quota-related commands
└── data/                 # Data files
    └── faq-responses.js  # FAQ response data
```

