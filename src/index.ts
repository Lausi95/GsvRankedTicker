require('dotenv').config();

import {initializePlayerRepository} from "./PlayerRepository";
import {league} from "./leauge";
import * as Discord from "./discord";
import {BotInteractionHandlers, Color} from "./discord";
import {createLogger} from "./Logging";
import * as playerRepository from './PlayerRepository';

const logger = createLogger('Index');

// 30 sekunden
const FETCH_TIMEOUT = 1_000 * 30;
const MATCH_INDEX_COUNT = 5;

async function indexMatchesOfPlayer(player: league.Player) {
  return league.getLatestMatchesOf(player, MATCH_INDEX_COUNT)
    .then(matches => matches.forEach(match => league.match.markAsSeen(match)));
}

function formatNames(names: string[]) {
  if (names.length < 2)
    return names.join('');
  if (names.length === 2)
    return names.join(' and ');
  return names.slice(0, names.length - 1).join(', ') + ' and ' + names[names.length - 1];
}

function formatMembersStatus(match: league.Match, members: league.MatchParticipant[]) {
  const time = match.time;
  const duration = Math.round(match.duration / 60);
  return 'Date: ' + time + '\nDuration: ' + duration + 'min\n\n' + members.map(formatMemberStats).join('\n\n');
}

function formatMemberStats(participant: league.MatchParticipant) {
  return `**${participant.summonerName}**
  Position: ${participant.position}
  Champion: ${participant.champion}
  KDA:      ${participant.kills}/${participant.deaths}/${participant.assists}
  CS:       ${participant.cs}`;
}

function formatTitle1() {
  return 'The GSV ranked journey continues!';
}

function formatTitle2(match: league.Match, members: league.MatchParticipant[], win: boolean) {
  const names = formatNames(members.map(m => m.summonerName));
  return names + ' just played a ranked ' + match.queue.name
    + ', and ' + (members.length > 1 ? 'they ' : 'he ')
    + (win ? `won! ${Discord.Emotes.pog}` : `lost ${Discord.Emotes.sadge}`);
}

async function fetchLeaugeResults() {
  const players = await playerRepository.getPlayers();
  for (const player of players) {
    logger.info(`analyzing player ${player.name}`);
    const matches = await league.getLatestMatchesOf(player, MATCH_INDEX_COUNT);

    for (const match of matches) {
      if (!league.match.isMatchSeen(match)) {
        if (match.queue.isRanked && !match.afk) {
          const members = match.participants.filter(p => players.find(pl => p.playerId === pl.id));
          const win = members[0].win;

          await Discord.sendLoLMessage({
            message: formatTitle1(),
            title: formatTitle2(match, members, win),
            body: formatMembersStatus(match, members),
            color: win ? Color.green : Color.red
          });
        }
      }
      league.match.markAsSeen(match);
    }
  }
}

async function initializeMatchWatcher(resolve: (value: (PromiseLike<void> | void)) => void): Promise<void> {
  try {
    logger.info('Initializing...');
    await initializePlayerRepository();
    const players = await playerRepository.getPlayers();
    for (const player of players) {
      await indexMatchesOfPlayer(player);
    }
    logger.info('Initializing done.');
    resolve();
  } catch (err) {
    logger.info(`Failed to ini: ${JSON.stringify(err)}`);
    setTimeout(() => initializeMatchWatcher(resolve), 10_000);
  }
}

function checkMatchesLoop() {
  fetchLeaugeResults()
    .then(() => setTimeout(checkMatchesLoop, FETCH_TIMEOUT))
    .catch((err) => {
      logger.error(JSON.stringify(err));
      setTimeout(checkMatchesLoop, FETCH_TIMEOUT);
    });
}

async function addPlayer(summonerName: string): Promise<void> {
  league.findPlayerBySummonerName(summonerName)
    .then((player) => playerRepository.addPlayer(player))
    .then(indexMatchesOfPlayer);
}

const handlers: BotInteractionHandlers = {
  onRegisterSummoner: addPlayer,
  onUnregisterSummoner: playerRepository.removePlayerBySummonerName,
};

Discord.registerCommands()
  .then(() => Discord.startBot(handlers))
  .catch(console.error);

new Promise((resolve) => initializeMatchWatcher(resolve))
  .then(checkMatchesLoop)
  .catch(err => logger.error(JSON.stringify(err)));
