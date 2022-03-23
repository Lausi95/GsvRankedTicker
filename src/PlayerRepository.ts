import * as fs from 'fs';
import {league} from "./leauge";

const FILE_NAME: string = './players.json';

const log = require('./Logging').createLogger('PlayerRepository');

if (!fs.existsSync(FILE_NAME)) {
  log.info('initialized playerfile')
  fs.writeFileSync(FILE_NAME, JSON.stringify([]));
}

let repository: league.Player[] = [];

export async function initializePlayerRepository(): Promise<void> {
  return new Promise((resolve) => tryInitializePlayerRepository(resolve));
}

async function tryInitializePlayerRepository(resolve: { (value: void | PromiseLike<void>): void; (): void; }) {
  fs.readFile(FILE_NAME, 'utf8', (err, data) => {
    if (err)
      return;
    repository = JSON.parse(data);
    log.info("Loaded players from file");
    resolve();
  });
}

export async function addPlayer(player: league.Player): Promise<league.Player> {
  if (repository.find(p => p.id === player.id))
    return player;
  log.info(`saving player ${player.id}`);
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

export async function getPlayers(): Promise<league.Player[]> {
  return repository;
}
