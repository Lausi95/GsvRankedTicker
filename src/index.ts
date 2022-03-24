import {cache} from "./cache";
import {playerRepository} from "./PlayerRepository";
import {league} from "./leauge";
import {discord} from "./discord";
import {logging} from "./Logging";

require('dotenv').config();

const log = logging.createLogger('main');

// 30 sekunden
const FETCH_TIMEOUT = 1_000 * 30;
const MATCH_INDEX_COUNT = 5;

async function indexMatchesOfPlayer(player: league.Player) {
  return league.getLatestMatchesOf(player, MATCH_INDEX_COUNT)
    .then(matches => matches.forEach(match => league.match.markAsSeen(match)));
}

async function analyseMatchesOfAllPlayers() {
  const players = await playerRepository.getPlayers();
  for (const player of players)
    await analyseMatchesOfPlayer(player, players);
}

async function analyseMatchesOfPlayer(player: league.Player, players: league.Player[]) {
  const matches = await league.getLatestMatchesOf(player, MATCH_INDEX_COUNT);
  for (const match of matches)
    await analyseMatch(match, players);
}

async function analyseMatch(match: league.Match, players: league.Player[]) {
  if (shouldPostMatch(match))
    await postMatch(match, players);
  league.match.markAsSeen(match);
}

function shouldPostMatch(match: league.Match): boolean {
  return !league.match.isMatchSeen(match) && match.queue.isRanked && !match.afk;
}

async function postMatch(match: league.Match, players: league.Player[]) {
  const members = match.participants.filter(p => players.find(pl => p.playerId === pl.id));
  const win = members[0].win;
  await discord.sendMessage({
    message: formatTitle1(),
    title: formatTitle2(match, members, win),
    body: formatMembersStatus(match, members),
    color: win ? discord.Color.green : discord.Color.red,
  });
}

function formatTitle1() {
  return 'The GSV ranked journey continues!';
}

function formatTitle2(match: league.Match, members: league.MatchParticipant[], win: boolean) {
  const names = formatNames(members.map(m => m.summonerName));
  return names + ' just played a ranked ' + match.queue.name
    + ', and ' + (members.length > 1 ? 'they ' : 'he ')
    + (win ? `won! ${discord.Emotes.pog}` : `lost ${discord.Emotes.sadge}`);
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
  return `Date: ${time}\nDuration: ${duration}min\n\n${members.map(formatMemberStats).join('\n\n')}`;
}

function formatMemberStats(participant: league.MatchParticipant) {
  return `**${participant.summonerName}**
  Position: ${participant.position}
  Champion: ${participant.champion}
  KDA:      ${participant.kills}/${participant.deaths}/${participant.assists}
  CS:       ${participant.cs}`;
}

function checkMatchesLoop() {
  analyseMatchesOfAllPlayers()
    .then(() => setTimeout(checkMatchesLoop, FETCH_TIMEOUT))
    .catch((err) => {
      log.error(JSON.stringify(err));
      setTimeout(checkMatchesLoop, FETCH_TIMEOUT);
    });
}

async function addPlayer(summonerName: string): Promise<void> {
  league.findPlayerBySummonerName(summonerName)
    .then(playerRepository.addPlayer)
    .then(indexMatchesOfPlayer);
}

const handlers: discord.BotInteractionHandlers = {
  onRegisterSummoner: addPlayer,
  onUnregisterSummoner: playerRepository.removePlayerBySummonerName,
};

async function initialize(): Promise<void> {
  await playerRepository.initialize()
  await discord.initialize(handlers);
  await cache.initialize();
  await league.initialize();
  log.info('Initialization done.');
}

async function premarkRecentMatches(): Promise<void> {
  const players = await playerRepository.getPlayers();
  for (const player of players)
    await indexMatchesOfPlayer(player);
}

initialize()
  .then(premarkRecentMatches)
  .then(checkMatchesLoop)
  .catch(err => log.error(JSON.stringify(err)));
