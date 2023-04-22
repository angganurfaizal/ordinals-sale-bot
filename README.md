# ordinals-sale-bot
The bot detects marketplace sales and sends notifications to Discord. It includes information such as the sold item's name, sale price in Bitcoin/USD, and sale URL. This feature keeps users informed of the latest marketplace activities and investment opportunities. 
### Discord :

1. Create a channel to receive sale notifications from the bot.
2. Create a webhook underneath this channel.

### Configuration:

Clone the repository: 
```
git clone https://github.com/nakamotocryptocard/ordinals-sale-bot.git
```

Install dependencies: 
```
npm install
```

Install pm2: 
```
npm install -g pm2
```

Compile TypeScript: 
```
npx tsc
```

Configure environment: Copy .env.example to .env and set the following variables:
```
DISCORD_WEBHOOK_URL: Your Discord webhook URL.
COLLECTION_SLUG: Your collection's slug.
INTERVAL: The interval in milliseconds at which the bot should check for new sales.
```
Start the bot:  
```
pm2 start build/index.js
```