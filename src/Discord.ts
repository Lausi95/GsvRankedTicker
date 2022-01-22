import * as Discord from 'discord.js';
import {SlashCommandBuilder} from "@discordjs/builders";
import {REST} from "@discordjs/rest";
import {Routes} from "discord-api-types/v9";

const AVATAR_URL = process.env.AVATAR_URL;
const BOT_NAME = 'GSV Ranked Ticker';

interface IEmotes {
  pog: string,
  sadge: string,
}

type Color = 'RED' | 'GREEN';

export const Emotes: IEmotes = {
  pog: '<:pog:853266160232431646>',
  sadge: '<:sadge:934050600696573952>'
};

const webhookClient = new Discord.WebhookClient({
  url: process.env.LEAUGE_WEBHOOK_URL || '',
});

export interface DiscordMessage {
  message: string,
  title: string,
  body: string,
  color: Color
}

export async function sendMessage(message: DiscordMessage) {
  const embed = new Discord.MessageEmbed()
    .setTitle(message.title)
    .setDescription(message.body)
    .setColor(message.color);

  await webhookClient.send({
    content: message.title,
    username: BOT_NAME,
    avatarURL: AVATAR_URL,
    embeds: [embed],
  });
}

export async function registerCommands() {
  const clientId = process.env.CLIENT_ID || '';
  const guildId = process.env.GUILD_ID || '';
  const botToken = process.env.DISCORD_BOT_TOKEN || '';

  const commands = [
    new SlashCommandBuilder().setName("add_player").addStringOption(
      option => option.setName('summoner_name').setDescription('Name of the summoner to be added').setRequired(true)
    ).setDescription("Adds a player to the watchlist"),
    new SlashCommandBuilder().setName("remove_player").addStringOption(
      option => option.setName('summoner_name').setDescription('Name of the summoner to be removed').setRequired(true)
    ).setDescription("Removes a player from the watchlist"),
  ].map(command => command.toJSON());

  const rest = new REST({ version: '9'}).setToken(botToken);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
}

export type BotInteraction = (summonerName: string) => Promise<void>;

export interface BotInteractionHandlers {
  onRegisterSummoner: BotInteraction,
  onUnregisterSummoner: BotInteraction,
}

export async function startBot(handlers: BotInteractionHandlers): Promise<any> {
  const client: Discord.Client = new Discord.Client({
    intents: [Discord.Intents.FLAGS.GUILDS]
  });

  client.once('ready', () => {
    console.log('ready');
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand())
      return;

    const command: string = interaction.commandName || '';
    const summonerName: string = interaction.options.getString('summoner_name') || '';

    if (command === 'add_player') {
      await handlers.onRegisterSummoner(summonerName)
        .then(() => interaction.reply(`${summonerName} added to the watchlist`))
        .catch(() => interaction.reply(`${summonerName} could not be added to the watchlist`))
    }
    if (command === 'remove_player') {
      await handlers.onUnregisterSummoner(summonerName)
        .then(() => interaction.reply(`${summonerName} removed from the watchlist`))
        .catch(() => interaction.reply(`${summonerName} could not be removed from the watchlist`))
    }
  });

  return client.login(process.env.DISCORD_BOT_TOKEN);
}
