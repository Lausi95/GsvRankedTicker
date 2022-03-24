import * as Discord from 'discord.js';
import {CacheType, Interaction} from 'discord.js';
import {SlashCommandBuilder} from "@discordjs/builders";
import {REST} from "@discordjs/rest";
import {RESTPostAPIApplicationCommandsJSONBody, Routes} from "discord-api-types/v9";
import {logging} from "./Logging";

export namespace discord {

  const log = logging.createLogger('Discord');

  const AVATAR_URL = process.env.AVATAR_URL;
  const BOT_NAME = 'GSV Ranked Ticker';

  export enum Color {
    red = 'RED',
    green = 'GREEN',
    yellow = 'YELLOW',
  }

  export enum Emotes {
    pog = '<:pog:853266160232431646>',
    sadge = '<:sadge:934050600696573952>'
  }

  log.info(`Discord Webhook URL: ${process.env.LEAUGE_WEBHOOK_URL}`);
  const webhookClient = new Discord.WebhookClient({
    url: process.env.LEAUGE_WEBHOOK_URL || '',
  });

  const DISCORD_BOT_OPTIONS = {
    intents: [Discord.Intents.FLAGS.GUILDS]
  };

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

  export async function initialize(handlers: BotInteractionHandlers): Promise<void> {
    log.info('Initializing discord...');
    await registerCommands();
    await startBot(handlers);
  }

  export async function registerCommands() {
    const clientId = process.env.CLIENT_ID || '';
    const guildId = process.env.GUILD_ID || '';
    const botToken = process.env.DISCORD_BOT_TOKEN || '';

    const rest = new REST({version: '9'}).setToken(botToken);
    return rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: createCommands()})
  }

  function createCommands(): RESTPostAPIApplicationCommandsJSONBody[] {
    const addPlayerCommand = new SlashCommandBuilder()
      .setName("add_player")
      .addStringOption(option => option
        .setName('summoner_name')
        .setDescription('Name of the summoner to be added')
        .setRequired(true))
      .setDescription("Adds a player to the watchlist");

    const removePlayerCommand = new SlashCommandBuilder()
      .setName("remove_player")
      .addStringOption(option => option
        .setName('summoner_name')
        .setDescription('Name of the summoner to be removed')
        .setRequired(true))
      .setDescription("Removes a player from the watchlist");

    return [addPlayerCommand, removePlayerCommand].map(command => command.toJSON());
  }


  export type BotInteraction = (summonerName: string) => Promise<void>;

  export interface BotInteractionHandlers {
    onRegisterSummoner: BotInteraction,
    onUnregisterSummoner: BotInteraction,
  }

  export async function startBot(handlers: BotInteractionHandlers): Promise<any> {
    const client: Discord.Client = new Discord.Client(DISCORD_BOT_OPTIONS);
    client.once('ready', onBotReady);
    client.on('interactionCreate', interaction => onBotInteraction(interaction, handlers));
    return client.login(process.env.DISCORD_BOT_TOKEN);
  }

  function onBotReady() {
    log.info('Bot connected');
  }

  async function onBotInteraction(interaction: Interaction<CacheType>, handlers: BotInteractionHandlers) {
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
  }
}
