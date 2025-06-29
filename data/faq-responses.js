const faqResponses = [
  {
    keywords: ['create server', 'how to make a server', 'start server'],
    title: 'How to Create a Server',
    description: '1. Go to FreeMinecraftHost.com and click "Play Now!"\n2. Create an account\n3. On dashboard, click "No servers yet. Why not create one?"\n4. Enter server name and version\n5. Click "Create server"\n6. Wait 60 seconds for server setup\n7. Use the Control Panel to manage your server\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#00FF00'
  },
  {
    keywords: ['forge version', 'change forge version', 'update forge'],
    title: 'How to Change Forge Version',
    description: '1. Go to Control Panel\n2. Stop your server\n3. Go to "Startup" tab\n4. Set Forge Version\n5. Check Java version compatibility\n6. Go to "Settings" tab\n7. Click "Reinstall Server"\n8. Start your server\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#0099FF'
  },
  {
    keywords: ['clicker app', 'run clicker', 'FMH clicker on PC'],
    title: 'How to Run FMH Clicker on PC',
    description: '1. Download BlueStacks from bluestacks.com\n2. Create a fresh Android 11 instance\n3. Sign into Google Play Store\n4. Search "com.silvereengames.freeminecrafthost"\n5. Install the app\n\nIMPORTANT: Use the same email as your Billing Panel account!\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#FF9900'
  },
  {
    keywords: ['coins', 'server coins', 'what are coins'],
    title: 'About Server Coins',
    description: '• 1 coin = 5 minutes of server uptime\n• Server uses 1 coin every 5 minutes\n• Deactivating costs 2 coins\n• Need 5 coins minimum to activate\n• Earn coins through our app or purchase credits\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#FF00FF'
  },
  {
    keywords: ['cracked', 'allow cracked', 'offline mode'],
    title: 'How to Allow Cracked Users',
    description: '1. Go to your Control Panel\n2. Stop your server\n3. Go to "Settings" tab\n4. Find "Server Properties"\n5. Set "online-mode" to "false"\n6. Save changes\n7. Start your server\n\nWARNING: Allowing cracked users reduces server security!\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#FF3333'
  },
  {
    keywords: ['add mods', 'install mods', 'how to add mods'],
    title: 'How to Add Mods to Forge/Fabric Server',
    description: '1. Go to Control Panel and stop your server\n2. Click "File Manager"\n3. For Forge: Navigate to "mods" folder\n   For Fabric: Navigate to "mods" folder\n4. Click "Upload" and select your mod files (.jar)\n5. Wait for upload to complete\n6. Start your server\n\nNOTE: Make sure mods are compatible with your server version!\nIMPORTANT: Players need the same mods installed to join.\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#9933FF'
  },
  {
    keywords: ['mod website', 'download mods', 'where to get mods'],
    title: 'Where to Download Minecraft Mods',
    description: 'Safe websites to download Minecraft mods:\n\n• CurseForge (curseforge.com)\n  - Largest mod repository\n  - Official mod platform\n  - Has mod verification\n\n• Modrinth (modrinth.com)\n  - Modern interface\n  - Open source\n  - Fast downloads\n\n• Planet Minecraft (planetminecraft.com)\n  - Community focused\n  - Resource packs & more\n\nWARNING: Only download from these trusted sites!\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#33CC33'
  },
  {
    keywords: ['enable whitelist', 'manage whitelist', 'whitelist commands'],
    title: 'How to Enable and Manage Whitelist',
    description: '1. Go to Control Panel\n2. Click "Console"\n3. Enable whitelist: /whitelist on\n4. Add player: /whitelist add [playername]\n5. Remove player: /whitelist remove [playername]\n6. View list: /whitelist list\n\nNOTE: Replace [playername] with the in-game username.\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#99CC00'
  },
  {
    keywords: ['install plugins', 'add plugins', 'plugin guide'],
    title: 'How to Install Plugins',
    description: '1. Ensure your server supports plugins (e.g., Spigot, Paper)\n2. Go to Control Panel\n3. Stop your server\n4. Navigate to "plugins" folder in File Manager\n5. Click "Upload" and select plugin files (.jar)\n6. Restart your server\n\nNOTE: Make sure plugins are compatible with your server version.\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#FF9933'
  },
  {
    keywords: ['change world', 'upload world', 'import world'],
    title: 'How to Upload or Change Your World',
    description: '1. Go to Control Panel\n2. Stop your server\n3. Go to "File Manager"\n4. Delete existing "world" folder\n5. Upload your custom world folder\n6. Rename the folder to "world"\n7. Start your server\n\nNOTE: Ensure the uploaded world matches your server version.\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#66CCFF'
  },
  {
    keywords: ['reset player stats', 'delete player stats', 'clear inventory'],
    title: 'How to Reset Player Stats',
    description: '1. Go to Control Panel\n2. Stop your server\n3. Navigate to "world/playerdata"\n4. Find the player\'s UUID file\n5. Delete or modify the file\n6. Start your server\n\nWARNING: Deleting playerdata will reset inventory and stats.\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#FF6699'
  },
  {
    keywords: ['reset nether', 'reset end', 'delete dimensions'],
    title: 'How to Reset Nether or End Worlds',
    description: '1. Go to Control Panel\n2. Stop your server\n3. Delete "DIM-1" (Nether) or "DIM1" (End) folder in File Manager\n4. Restart your server to generate a fresh dimension\n\nNOTE: Always backup your data before resetting.\n\nCouldn\'t find what you\'re looking for? Visit https://forum.freeminecrafthost.com for more info',
    color: '#993333'
  },
  {
    keywords: ['invites', 'invite members', 'member invites'],
    title: 'Member Invites Verification',
    description: 'Thanks for inviting the members! Please wait 3 days so we can verify and give you your coins.\n\nThis waiting period helps us ensure the invites are genuine and prevents abuse of the system.',
    color: '#FF9900'
  }
];

function getFaqByTopic(topic) {
  const faqMap = {
    'create_server': 0,
    'forge_version': 1,
    'clicker_app': 2,
    'coins': 3,
    'cracked': 4,
    'add_mods': 5,
    'mod_website': 6,
    'whitelist': 7,
    'install_plugins': 8,
    'change_world': 9,
    'player_stats': 10,
    'nether_or_end': 11,
    'invites': 12
  };

  return faqResponses[faqMap[topic]];
}

module.exports = { 
  faqResponses,
  getFaqByTopic
};