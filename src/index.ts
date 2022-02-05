import * as Discord from "./Discord";
import {BotInteractionHandlers, Color} from "./Discord";
import {RiotAPITypes} from "@fightmegg/riot-api";
import {createLogger} from "./Logging";
import * as playerRepository from './PlayerRepository';
import * as leaugeMatchRepository from './LeaugeMatchRepository';
import * as riotAdapter from './RiotApiAdapter';

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
  return QUEUE_TYPES.find(queueType => queueType.id === match.info.queueId);
}

function formatRankedTypeName(match: RiotAPITypes.MatchV5.MatchDTO) {
  return QUEUE_TYPES.find(queueType => queueType.id === match.info.queueId)?.name || 'Unbekannter Modus';
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
  CS: ${participant.totalMinionsKilled + participant.neutralMinionsKilled}`;
}

function formatTitle1() {
  return 'The GSV ranked journey continues!';
}

function formatTitle2(match: RiotAPITypes.MatchV5.MatchDTO, members: RiotAPITypes.MatchV5.ParticipantDTO[], win: boolean) {
  const names = formatNames(members.map(m => m.summonerName));
  return names + ' just played a ranked ' + formatRankedTypeName(match)
    + ', and ' + (members.length > 1 ? 'they ' : 'he ')
    + (win ? `won! ${Discord.Emotes.pog}` : `lost ${Discord.Emotes.sadge}`);
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

          await Discord.sendLoLMessage({
            message: formatTitle1(),
            title: formatTitle2(match, members, win),
            body: formatMembersStatus(match, members),
            color: win ? Color.green : Color.red
          });
        }

        await leaugeMatchRepository.addMatch(matchId);
      } else {
        logger.info(`match ${matchId} already analyzed`);
      }
    }
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

function addPlayer(summonerName: string): Promise<void> {
  return riotAdapter.fetchPlayer(summonerName)
    .then(playerRepository.addPlayer)
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
