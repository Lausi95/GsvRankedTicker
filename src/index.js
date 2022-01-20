require('dotenv').config();

const { WebhookClient, MessageEmbed } = require('discord.js');
const { RiotAPI, PlatformId } = require('@fightmegg/riot-api');

const playerRepository = require('./PlayerRepository');
const matchRepository = require('./MatchRepository');

const logger = require('./Logging').createLogger('Index');

// 30 minutes
const FETCH_TIMEOUT = 1_000 * 60 * 30;

const webhookClient = new WebhookClient({
  url: process.env.WEBHOOK_URL,
});

const rAPI = new RiotAPI(process.env.RIOT_API_KEY);

function formatNames(names) {
  if (names.length < 2)
    return names.join('');
  if (names.length === 2)
    return names.join(' and ');
  return names.slice(0, names.length - 1).join(', ') + ' and ' + names[names.length - 1];
}

async function indexPastMatches() {
  const players = await playerRepository.getPlayers();
  logger.info(`Indexing matches of ${players.length} players`);
  for (const player of players) {
    logger.info(`Indexing matches of ${player.name}`);
    const matchHistory = await rAPI.matchV5.getIdsbyPuuid({
      cluster: PlatformId.EUROPE,
      puuid: player.puuid,
      params: {
        start: 0,
        count: 5,
      },
    });
    for (const matchId of matchHistory)
      await matchRepository.addMatch(matchId);
  }
}

async function fetchResults() {
  const players = await playerRepository.getPlayers();

  for (const player of players) {
    logger.info(`analyzing player ${player.name}`);
    const matchHistory = await rAPI.matchV5.getIdsbyPuuid({
      cluster: PlatformId.EUROPE,
      puuid: player.puuid,
      params: {
        start: 0,
        count: 5,
      },
    });

    for (const matchId of matchHistory) {
      if (!(await matchRepository.matchExists(matchId))) {
        const match = await rAPI.matchV5.getMatchById({
          cluster: PlatformId.EUROPE,
          matchId: matchId,
        });

        logger.info(match.info.gameName, match.info.gameType);

        const members = match.info.participants.filter(p => players.find(pl => p.puuid === pl.puuid));
        const win = members[0].win;
        const names = formatNames(members.map(m => m.summonerName));

        const statistics = members.map(m => {
          return `${m.summonerName}\nPosition: ${m.teamPosition}\nChampion: ${m.championName}\nKDA: ${m.kills}/${m.deaths}/${m.assists}`;
        }).join('\n\n');

        const embed = new MessageEmbed()
          .setTitle(names + ' just played a ranked game, and ' + (members.length > 1 ? 'they ' : 'he ') + (win ? 'won' : 'lost'))
          .setDescription(statistics)
          .setColor((win ? 'GREEN' : 'RED'));

        await webhookClient.send({
          content: 'The leauge journey continues!',
          username: 'GSV Ranked Ticker',
          avatarURL: 'https://i.imgur.com/AfFp7pu.png',
          embeds: [embed],
        });

        await matchRepository.addMatch(matchId);
      }
    }
  }
}

function loop() {
  fetchResults()
    .then(() => setTimeout(loop, FETCH_TIMEOUT))
    .catch(logger.error);
}

Promise.all([
  playerRepository.addPlayer('L4usi'),
  playerRepository.addPlayer('FingersHurt'),
  playerRepository.addPlayer('ROOFEEH'),
]).then(indexPastMatches).then(loop).catch(logger.error);
