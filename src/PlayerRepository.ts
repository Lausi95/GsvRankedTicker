import * as fs from 'fs';
import {league} from "./leauge";
import {logging} from "./Logging";

export namespace playerRepository {

  const log = logging.createLogger('player repository');

  const FILE_NAME: string = './players.json';

  let repository: league.Player[] = [];

  export async function initialize(): Promise<void> {
    log.info('Initializing player repository...');
    if (!fs.existsSync(FILE_NAME)) {
      fs.writeFileSync(FILE_NAME, JSON.stringify([]));
    } else {
      fs.readFile(FILE_NAME, 'utf8', (err, data) => {
        if (err)
          return;
        repository = JSON.parse(data);
      });
    }
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
}
