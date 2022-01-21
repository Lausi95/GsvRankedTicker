import {RiotAPITypes} from "@fightmegg/riot-api";

const logger = require('./Logging').createLogger('PlayerRepository');

let repository: RiotAPITypes.Summoner.SummonerDTO[] = [];

export async function addPlayer(player: RiotAPITypes.Summoner.SummonerDTO) {
  if (repository.find(p => p.puuid === player.puuid))
    return;
  logger.info(`saving player ${player.puuid}`);
  repository = [...repository, player];
}

export async function removePlayer(player: RiotAPITypes.Summoner.SummonerDTO) {
  logger.info(`removing player ${player.puuid}`);
  repository = repository.filter(p => p !== player);
}

export async function getPlayers(): Promise<RiotAPITypes.Summoner.SummonerDTO[]> {
  return repository;
}
