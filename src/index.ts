import {league} from "./leauge";
import * as Discord from "./discord";
import {BotInteractionHandlers, Color} from "./discord";
import {createLogger} from "./Logging";
import * as playerRepository from './PlayerRepository';

require('dotenv').config();

const logger = createLogger('Index');

// 30 sekunden
const FETCH_TIMEOUT = 1_000 * 30;

interface QueueType {
  id: number,
  name: string
}

const QUEUE_TYPES: QueueType[] = [
  {
    id: 420,
    name: 'Ranked'
  },
  {
    id: 440,
    name: 'Flex'
  }
];

async function indexMatchesOfPlayer(player: league.Player) {
  league.getLatestMatchesOf(player, 10).then(matches => matches.forEach(match => league.match.markAsSeen(match)));
}

function formatNames(names: string[]) {
  if (names.length < 2)
    return names.join('');
  if (names.length === 2)
    return names.join(' and ');
  return names.slice(0, names.length - 1).join(', ') + ' and ' + names[names.length - 1];
}

function formatMembersStatus(match: league.Match, members: league.MatchParticipant[]) {
  const time = new Date(match.time);
  const duration = Math.round(match.duration / 60);
  return time + '\nDuration: ' + duration + 'min\n\n' + members.map(formatMemberStats).join('\n\n');
}

function formatMemberStats(participant: league.MatchParticipant) {
  return `**${participant.summonerName}**
  Position: ${participant.position}
  Champion: ${participant.champion}
  KDA: ${participant.kills}/${participant.deaths}/${participant.assists}
  CS: ${participant.cs}`;
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
    const matches = await league.getLatestMatchesOf(player, 10);

    for (const match of matches) {
      if (!league.match.isMatchSeen(match)) {
        if (match.queue.isRanked) {
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
    }
  }
}

async function initialize(resolve: (value: (PromiseLike<void> | void)) => void): Promise<void> {
  try {

    resolve();
  } catch {
    setTimeout(() => initialize(resolve), 10_000);
  }
}

function loop() {
  fetchLeaugeResults()
    .then(() => setTimeout(loop, FETCH_TIMEOUT))
    .catch(onLoopError);
}

function onLoopError(err: any) {
  logger.error(JSON.stringify(err));
  setTimeout(loop, FETCH_TIMEOUT);
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

loop();
