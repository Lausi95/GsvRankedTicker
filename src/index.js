require('dotenv').config();

const { WebhookClient, MessageEmbed } = require('discord.js');

const playerRepository = require('./PlayerRepository');
const leaugeMatchRepository = require('./LeaugeMatchRepository');
const riotAdapter = require('./RiotApiAdapter');

const logger = require('./Logging').createLogger('Index');

// 1 Minute
const FETCH_TIMEOUT = 1_000 * 60;

const RANKED_QUEUE_ID = 420;
const FLEX_QUEUE_ID = 440;

const webhookClient = new WebhookClient({
  url: process.env.WEBHOOK_URL,
});

async function indexPastLeaugeMatches() {
  const players = await playerRepository.getPlayers();
  for (const player of players)
    await indexMatchesOfPlayer(player);
}

async function indexMatchesOfPlayer(player) {
  await riotAdapter.fetchMatchIds(player.puuid).then(leaugeMatchRepository.addMatches);
}

function formatNames(names) {
  if (names.length < 2)
    return names.join('');
  if (names.length === 2)
    return names.join(' and ');
  return names.slice(0, names.length - 1).join(', ') + ' and ' + names[names.length - 1];
}

function isRankedMatch(match) {
  const queueId = match.info.queueId;
  return queueId === FLEX_QUEUE_ID || queueId === RANKED_QUEUE_ID;
}

function formatRankedTypeName(match) {
  const queueId = match.info.queueId;
  if (queueId === FLEX_QUEUE_ID)
    return 'Flex';
  if (queueId === RANKED_QUEUE_ID)
    return 'Solo/Duo';
  return 'Unbekannter Modul';
}

function formatMembersStatus(members) {
  return members.map(formatMemberStats).join('\n\n');
}

function formatMemberStats(m) {
  return `**${m.summonerName}**\nPosition: ${m.teamPosition}\nChampion: ${m.championName}\nKDA: ${m.kills}/${m.deaths}/${m.assists}`;
}

function formatTitle(match, members, win) {
  const names = formatNames(members.map(m => m.summonerName));
  return names + ' just played a ranked ' + formatRankedTypeName(match) + ', and ' + (members.length > 1 ? 'they ' : 'he ') + (win ? 'won! :smile:' : 'lost :frowning:');
}

async function fetchLeaugeResults() {
  const players = await playerRepository.getPlayers();
  for (const player of players) {
    logger.info(`analyzing player ${player.name}`);
    const matchHistory = await riotAdapter.fetchMatchIds(player.puuid);

    for (const matchId of matchHistory) {
      if (!(await leaugeMatchRepository.matchExists(matchId))) {
        const match = await riotAdapter.fetchMatch(matchId);

        if (isRankedMatch(match)) {
          logger.info(match.info.gameName, match.info.gameType);

          const members = match.info.participants.filter(p => players.find(pl => p.puuid === pl.puuid));
          const win = members[0].win;

          const embed = new MessageEmbed()
            .setTitle(formatTitle(match, members, win))
            .setDescription(formatMembersStatus(members))
            .setColor((win ? 'GREEN' : 'RED'));

          await webhookClient.send({
            content: 'The leauge journey continues!',
            username: 'GSV Ranked Ticker',
            avatarURL: process.env.AVATAR_URL,
            embeds: [embed],
          });
        }

        await leaugeMatchRepository.addMatch(matchId);
      }
      else {
        logger.info(`match ${matchId} already analyzed`);
      }
    }
  }
}

function loop() {
  fetchLeaugeResults()
    .then(() => setTimeout(loop, FETCH_TIMEOUT))
    .catch(logger.error);
}

function addPlayer(summonerName) {
  return riotAdapter.fetchPlayer(summonerName).then(playerRepository.addPlayer);
}

function addInitialPlayers() {
  return [
    addPlayer('L4usi'),
    addPlayer('russkovski'),
    addPlayer('ROOFEEH'),
    addPlayer('FingersHurt'),
    addPlayer('Midspieler'),
  ];
}

Promise.all(addInitialPlayers())
  .then(indexPastLeaugeMatches)
  .then(loop)
  .catch(err => console.dir(err, { depth: 10 }));
