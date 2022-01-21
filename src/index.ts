import {RiotAPITypes} from "@fightmegg/riot-api";

require('dotenv').config();

import { WebhookClient, MessageEmbed } from 'discord.js';

import {createLogger} from "./Logging";
import * as playerRepository from './PlayerRepository';
import * as leaugeMatchRepository from './LeaugeMatchRepository';
import * as riotAdapter from './RiotApiAdapter';

const logger = createLogger('Index');

// 1 Minute
const FETCH_TIMEOUT = 1_000 * 60;

const RANKED_QUEUE_ID = 420;
const FLEX_QUEUE_ID = 440;

const webhookClient = new WebhookClient({
  url: process.env.WEBHOOK_URL || '',
});

async function indexPastLeaugeMatches() {
  const players = await playerRepository.getPlayers();
  for (const player of players)
    await indexMatchesOfPlayer(player);
}

async function indexMatchesOfPlayer(player: RiotAPITypes.Summoner.SummonerDTO) {
  await riotAdapter.fetchMatchIds(player.puuid).then(leaugeMatchRepository.addMatches);
}

function formatNames(names: string[]) {
  if (names.length < 2)
    return names.join('');
  if (names.length === 2)
    return names.join(' and ');
  return names.slice(0, names.length - 1).join(', ') + ' and ' + names[names.length - 1];
}

function isRankedMatch(match: RiotAPITypes.MatchV5.MatchDTO) {
  const queueId = match.info.queueId;
  return queueId === FLEX_QUEUE_ID || queueId === RANKED_QUEUE_ID;
}

function formatRankedTypeName(match: RiotAPITypes.MatchV5.MatchDTO) {
  const queueId = match.info.queueId;
  if (queueId === FLEX_QUEUE_ID)
    return 'Flex';
  if (queueId === RANKED_QUEUE_ID)
    return 'Solo/Duo';
  return 'Unbekannter Modul';
}

function formatMembersStatus(match: RiotAPITypes.MatchV5.MatchDTO, members: RiotAPITypes.MatchV5.ParticipantDTO[]) {
  const time = new Date(match.info.gameStartTimestamp);
  const duration = Math.round(match.info.gameDuration / 60);
  return time + '\nDuration: ' + duration + 'min\n\n' + members.map(formatMemberStats).join('\n\n');
}

function formatMemberStats(participant: RiotAPITypes.MatchV5.ParticipantDTO) {
  return `**${participant.summonerName}**
  Position: ${participant.teamPosition}
  Champion: ${participant.championName}
  KDA: ${participant.kills}/${participant.deaths}/${participant.assists}
  CS: ${participant.totalMinionsKilled}`;
}

function formatTitle1() {
  return 'The GSV ranked journey continues!';
}

function formatTitle2(match: RiotAPITypes.MatchV5.MatchDTO, members: RiotAPITypes.MatchV5.ParticipantDTO[], win: boolean) {
  const names = formatNames(members.map(m => m.summonerName));
  return names + ' just played a ranked ' + formatRankedTypeName(match) + ', and ' + (members.length > 1 ? 'they ' : 'he ') + (win ? 'won! <:pog:853266160232431646>' : 'lost <:sadge:934050600696573952>');
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
            .setTitle(formatTitle2(match, members, win))
            .setDescription(formatMembersStatus(match, members))
            .setColor((win ? 'GREEN' : 'RED'));

          await webhookClient.send({
            content: formatTitle1(),
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

function addPlayer(summonerName: string) : Promise<void> {
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
