import {createLogger} from "./Logging";
import {PlatformId, RiotAPI, RiotAPITypes} from '@fightmegg/riot-api';

const logger = createLogger('RiotAdapter');

const riotApi = new RiotAPI(process.env.RIOT_API_KEY || '');

const MATCH_HISTORY_AMOUNT: number = 1;

export async function fetchMatchIds(puuid: string): Promise<string[]> {
  logger.info(`fetch last ${MATCH_HISTORY_AMOUNT} matches of player ${puuid}`);
  return await riotApi.matchV5.getIdsbyPuuid({
    puuid: puuid,
    cluster: PlatformId.EUROPE,
    params: {
      start: 0,
      count: MATCH_HISTORY_AMOUNT,
    },
  });
}

export async function fetchMatch(matchId: string): Promise<RiotAPITypes.MatchV5.MatchDTO> {
  logger.info(`fetch match ${matchId}`);
  return await riotApi.matchV5.getMatchById({
    matchId: matchId,
    cluster: PlatformId.EUROPE,
  });
}

export async function fetchPlayer(summonerName: string): Promise<RiotAPITypes.Summoner.SummonerDTO> {
  logger.info(`fetch player ${summonerName}`);
  return await riotApi.summoner.getBySummonerName({
    region: PlatformId.EUW1,
    summonerName: summonerName,
  });
}

