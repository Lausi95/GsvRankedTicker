const { RiotAPI, PlatformId } = require('@fightmegg/riot-api');
const logger = require('./Logging').createLogger('RiotAdapter');

const riotApi = new RiotAPI(process.env.RIOT_API_KEY);

const MATCH_HISTORY_AMOUNT = 1;

async function fetchMatchIds(puuid) {
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

async function fetchMatch(matchId) {
  logger.info(`fetch match ${matchId}`);
  return await riotApi.matchV5.getMatchById({
    matchId: matchId,
    cluster: PlatformId.EUROPE,
  });
}

async function fetchPlayer(summonerName) {
  logger.info(`fetch player ${summonerName}`);
  return await riotApi.summoner.getBySummonerName({
    region: PlatformId.EUW1,
    summonerName: summonerName,
  });
}

module.exports = {
  fetchPlayer,
  fetchMatchIds,
  fetchMatch,
};
