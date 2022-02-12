import {PlatformId, RiotAPI} from "@fightmegg/riot-api";
import {createLogger} from "../../Logging";
import {LolPlayer} from "./LolPlayer";
import {LolMatch, LolMatchParticipant, Position} from "./LolMatch";

const log = createLogger('lol adapter');
const riotApi = new RiotAPI(process.env.RIOT_API_KEY || '');

/**
 * Finds a leauge player by his/her summoner name.
 *
 * @param {string} summonerName
 */
export async function findPlayerBySummonerName(summonerName: string): Promise<LolPlayer> {
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
 * Find a leauge player by his/her player id.
 *
 * @param {number} playerId
 */
export async function findPlayerById(playerId: string): Promise<LolPlayer> {
  log.info(`Resolving player with id ${playerId}`);
  return riotApi.summoner.getByPUUID({
    region: PlatformId.EUW1,
    puuid: playerId
  }).then(resp => ({
    id: resp.puuid,
    name: resp.name,
  }));
}

/**
 * Finds the last leauge match ids of a player.
 *
 * @param player {LolPlayer} Player to get the match ids from
 * @param amount {number} Amount of match IDs to fetch
 */
export async function findLastMatchIdsOfPlayer(player: LolPlayer, amount: number): Promise<string[]> {
  log.info(`Finding last ${amount} match ids of player ${player.name}`);
  return riotApi.matchV5.getIdsbyPuuid({
    puuid: player.id,
    cluster: PlatformId.EUROPE,
    params: {
      start: 0,
      count: amount,
    },
  });
}

/**
 * Finds a leauge match by the given id.
 *
 * @param {number} matchId
 */
export async function findMatchById(matchId: string): Promise<LolMatch> {
  log.info(`Resolving match ${matchId}`);
  return riotApi.matchV5.getMatchById({
    matchId: matchId,
    cluster: PlatformId.EUROPE,
  }).then(riotResponse => {
    const participants: LolMatchParticipant[] = riotResponse.info.participants.map(p => ({
      playerId: p.puuid,
      win: p.win,
      position: mapPosition(p.teamPosition),
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
    }));
    return {
      id: riotResponse.info.gameId,
      time: riotResponse.info.gameStartTimestamp,
      duration: riotResponse.info.gameDuration,
      participants: participants
    };
  });
}

function mapPosition(position: string): Position {
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
