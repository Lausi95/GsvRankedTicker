import {PlatformId, RiotAPI, RiotAPITypes} from "@fightmegg/riot-api";
import {createLogger} from "./Logging";

const log = createLogger('lol adapter');
const riotApi = new RiotAPI(process.env.RIOT_API_KEY || '');

export interface Player {
  id: string;
  name: string;
}

export interface Match {
  id: number;
  time: number;
  duration: number;
  participants: MatchParticipant[];
}

export interface MatchParticipant {
  playerId: string;
  win: boolean;
  position: Position;
  champion: string;
  cs: number;
  penta: boolean;
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  visionScore: number;
  wardsPlaces: number;
  damageDealt: number;
  damageTaken: number;
  objectiveDamage: number;
  healingDone: number;
}

export enum Position {
  ADC = 'ADC',
  SUPPORT = 'Support',
  MID = 'Mid',
  JUNGLE = 'Jungler',
  TOP = 'Top',
  UNDEFINED = '???',
}

/**
 * Finds a league player by his/her summoner name.
 * @param {string} summonerName
 */
export async function findPlayerBySummonerName(summonerName: string): Promise<Player> {
  log.info(`Resolving player with summoner name ${summonerName}`);
  return riotApi.summoner.getBySummonerName({
    region: PlatformId.EUW1,
    summonerName: summonerName,
  }).then(riotResponse => ({
    id: riotResponse.puuid,
    name: riotResponse.name
  }));
}

/**
 * Find a league player by his/her player id.
 * @param {number} playerId
 */
async function findPlayerById(playerId: string): Promise<Player> {
  return riotApi.summoner.getByPUUID({
    region: PlatformId.EUW1,
    puuid: playerId
  }).then(resp => ({
    id: resp.puuid,
    name: resp.name,
  }));
}

export async function getLatestMatchesOf(player: Player, amount: number): Promise<Match[]> {
  const matchIds = await getLatestMatchIdsOf(player, amount);
  return await Promise.all(matchIds.map(getMatch));
}

async function getLatestMatchIdsOf(player: Player, amount: number): Promise<string[]> {
  return riotApi.matchV5.getIdsbyPuuid({
    puuid: player.id,
    cluster: PlatformId.EUROPE,
    params: {
      start: 0,
      count: amount,
    },
  });
}

export async function getMatch(matchId: string): Promise<Match> {
  return riotApi.matchV5.getMatchById({
    matchId: matchId,
    cluster: PlatformId.EUROPE,
  }).then(mapMatchDtoToMatch);
}

function mapMatchDtoToMatch(matchDto: RiotAPITypes.MatchV5.MatchDTO): Match {
  return {
    id: matchDto.info.gameId,
    time: matchDto.info.gameStartTimestamp,
    duration: matchDto.info.gameDuration,
    participants: matchDto.info.participants.map(p => ({
      playerId: p.puuid,
      win: p.win,
      position: parsePosition(p.teamPosition),
      champion: p.championName,
      cs: p.totalMinionsKilled + p.neutralMinionsKilled,
      penta: p.pentaKills > 0,
      gold: p.goldEarned,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      visionScore: p.visionScore,
      wardsPlaces: p.wardsPlaced,
      damageDealt: p.totalDamageDealtToChampions,
      damageTaken: p.totalDamageTaken,
      objectiveDamage: p.damageDealtToObjectives,
      healingDone: p.totalHealsOnTeammates,
    }))
  };
}

function parsePosition(position: string): Position {
  switch (position) {
    case 'UTILITY':
      return Position.SUPPORT;
    case 'BOTTOM':
      return Position.ADC;
    case 'MIDDLE':
      return Position.MID;
    case 'JUNGLE':
      return Position.JUNGLE;
    case 'TOP':
      return Position.TOP;
  }
  return Position.UNDEFINED;
}
