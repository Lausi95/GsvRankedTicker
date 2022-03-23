import {PlatformId, RiotAPI, RiotAPITypes} from "@fightmegg/riot-api";
import {createLogger} from "./Logging";
import {cache} from './cache'

export namespace league {

  const log = createLogger('lol adapter');

  let riotApi: RiotAPI;

  export interface QueueType {
    id: number;
    name: string;
    isRanked: boolean;
  }

  export const QUEUE_TYPES: QueueType[] = [
    {
      id: 420,
      name: 'Ranked',
      isRanked: true,
    },
    {
      id: 440,
      name: 'Flex',
      isRanked: true,
    }
  ];

  export interface Player {
    id: string;
    name: string;
  }

  export interface Match {
    id: number;
    time: number;
    duration: number;
    queue: QueueType;
    participants: MatchParticipant[];
  }

  export interface MatchParticipant {
    playerId: string;
    summonerName: string;
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

  async function initializeApi() {
    if (riotApi)
      return;

    if (!process.env.RIOT_API_KEY)
      throw 'Riot API-Key not configured!';

    riotApi = new RiotAPI(process.env.RIOT_API_KEY);
  }

  /**
   * Finds a league player by his/her summoner name.
   * @param {string} summonerName
   */
  export async function findPlayerBySummonerName(summonerName: string): Promise<Player> {
    await initializeApi();

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
    await initializeApi();

    return riotApi.summoner.getByPUUID({
      region: PlatformId.EUW1,
      puuid: playerId
    }).then(resp => ({
      id: resp.puuid,
      name: resp.name,
    }));
  }

  export async function getLatestMatchesOf(player: Player, amount: number): Promise<Match[]> {
    await initializeApi();

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

  async function getMatch(matchId: string): Promise<Match> {
    return cache.getOrResolve<Match>('lolMatch', matchId, () => {
      return riotApi.matchV5.getMatchById({
        matchId: matchId,
        cluster: PlatformId.EUROPE,
      }).then(mapMatchDtoToMatch);
    });
  }

  function mapMatchDtoToMatch(matchDto: RiotAPITypes.MatchV5.MatchDTO): Match {
    return {
      id: matchDto.info.gameId,
      time: matchDto.info.gameStartTimestamp,
      duration: matchDto.info.gameDuration,
      queue: QUEUE_TYPES.find(qt => qt.id === matchDto.info.queueId) || {id: -1, name: '??', isRanked: false},
      participants: matchDto.info.participants.map(p => ({
        playerId: p.puuid,
        summonerName: p.summonerName,
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

  export namespace match {
    let seenMatches: league.Match[] = [];

    export function markAsSeen(match: league.Match) {
      seenMatches.push(match);
    }

    export function isMatchSeen(match: league.Match): boolean {
      return seenMatches.includes(match);
    }
  }
}
