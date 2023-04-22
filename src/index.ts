import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const interval = process.env.INTERVAL;
const btcRateUrl = "https://cloud-functions.twetch.app/api/btc-exchange-rate";
const file = 'latest_bought_at.txt';

try {
  await fs.promises.access(file, fs.constants.F_OK);
} catch (err) {
  await fs.promises.writeFile(file, '');
  console.log('File created:', file);
}

interface Node {
  id: string;
  meta: { name: string };
  escrow: { bought_at: string; satoshi_price: number };
}

interface SaleBotError extends Error {
  message: string;
}

async function sendMessageToDiscordChannel(message: string): Promise<void> {
  try {
    if (webhookUrl){
    const response = await axios.post(webhookUrl, {
      content: message,
    });
    console.log('Message sent to Discord:', response.data);
  }
  } catch (error) {
    console.error('Failed to send message to Discord:', error);
  }
}

async function getBtcExchangeRate(): Promise<number | null> {
  try {
    if (btcRateUrl){
    const response = await axios.get(btcRateUrl);
    return response.data.price;
    } else return 0;
  } catch (error) {
    console.error('Failed to get BTC exchange rate:', error);
    return null;
  }
}

async function checkLatestBoughtAt(): Promise<void> {
  const payload = {
    attributes: [],
  };

  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    baseURL: 'https://turbo.ordinalswallet.com',
    url: `/collection/${process.env.COLLECTION_SLUG}/activity?offset=0&order=BoughtAtDesc&listed=false`,
    method: 'POST',
    data: payload,
  };

  try {
    const response = await axios(config);
    const activity = response.data;

    if (activity.length > 0) {
      const latestBoughtAt = activity[0].escrow.bought_at;
      fs.readFile(file, 'utf8', async (err, data) => {
        if (err) throw err;
        const previousBoughtAt = data.trim();
        const btcRate = await getBtcExchangeRate();

        if (btcRate) {
          const nodesToUpdate = activity.filter((node : Node) => node.escrow.bought_at > previousBoughtAt);

          if (nodesToUpdate.length > 0) {
            for (const node of nodesToUpdate) {
              const priceInBtc = node.escrow.satoshi_price / 100000000;
              const priceInUsd = priceInBtc * btcRate;
              const message = `${node.meta.name} just sold for ${priceInBtc} BTC ($${priceInUsd.toFixed(2)}) on @ordinalswallet! Check it out :point_down:  https://ordinalswallet.com/inscription/${node.id}`;
              await sendMessageToDiscordChannel(message);
            }

            const updateDiscord = nodesToUpdate.map((node : Node) => {
              const priceInBtc = node.escrow.satoshi_price / 100000000;
              const priceInUsd = priceInBtc * btcRate;
              return `${node.meta.name} just sold for ${priceInBtc} BTC ($${priceInUsd.toFixed(2)}) on @ordinalswallet! Check it out :point_down:  https://ordinalswallet.com/inscription/${node.id}`;
            }).join('\n');

            fs.writeFile('update_discord.txt', updateDiscord, { flag: 'w' }, (err) => {
              if (err) throw err;
              console.log(`Successfully saved update to Discord: ${updateDiscord}`);
            });

            fs.writeFile('latest_bought_at.txt', latestBoughtAt, { flag: 'w' }, (err) => {
              if (err) throw err;
              console.log(`Successfully updated latest bought_at timestamp: ${latestBoughtAt}`);
            });
          } else {
            console.log('No updates found.');
          }
        }
      });
    } else {
      console.log('No activity found.');
    }
  } catch (error) {
    console.log('Error:', (error as SaleBotError).message);
  }
}

if (typeof interval === 'string') {
  setInterval(checkLatestBoughtAt, parseInt(interval));
} else {
  console.error('Interval is not defined');
}

