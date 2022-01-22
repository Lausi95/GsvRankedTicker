import {RiotAPITypes} from "@fightmegg/riot-api";
import * as fs from 'fs';

const FILE_NAME:string = './players.json';

const log = require('./Logging').createLogger('PlayerRepository');

if (!fs.existsSync(FILE_NAME)) {
  log.info('initialized playerfile')
  fs.writeFileSync(FILE_NAME, JSON.stringify([]));
}

let repository: RiotAPITypes.Summoner.SummonerDTO[] = [];
fs.readFile(FILE_NAME, 'utf8', (err, data) => {
  if (err)
    return;
  repository = JSON.parse(data);
  log.info("Loaded players from file")
});

export async function addPlayer(player: RiotAPITypes.Summoner.SummonerDTO) : Promise<RiotAPITypes.Summoner.SummonerDTO> {
  if (repository.find(p => p.puuid === player.puuid))
    return player;
  log.info(`saving player ${player.puuid}`);
  repository = [...repository, player];
  updatePlayerFile();
  return player;
}

export async function removePlayerBySummonerName(summonerName: string) {
  log.info(`removing player ${summonerName}`);
  repository = repository.filter(p => p.name !== summonerName);
  updatePlayerFile();
}

function updatePlayerFile() {
  log.info('updating playerfile')
  fs.writeFileSync(FILE_NAME, JSON.stringify(repository));
}

export async function getPlayers(): Promise<RiotAPITypes.Summoner.SummonerDTO[]> {
  return repository;
}
