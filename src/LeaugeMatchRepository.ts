import {createLogger} from "./Logging";
import * as fs from 'fs';

const FILE_NAME:string = './matches.json';

const log = createLogger('LeaugeMatchRepository');

if (!fs.existsSync(FILE_NAME)) {
  log.info('initialized matchfile')
  fs.writeFileSync(FILE_NAME, JSON.stringify([]));
}

let repository: string[] = [];
fs.readFile(FILE_NAME, 'utf8', (err, data) => {
  if (err)
    return;
  repository = JSON.parse(data);
  log.info("Loaded matches from file")
});

export async function matchExists(matchId: string) {
  return !!repository.find(m => m === matchId);
}

export async function addMatch(matchId: string) {
  const exists = await matchExists(matchId);
  if (exists)
    return;
  log.info(`Add match ${matchId}`);
  repository = [...repository, matchId];
  updateMatchFile()
}

function updateMatchFile() {
  log.info('updating matchfile')
  fs.writeFileSync(FILE_NAME, JSON.stringify(repository));
}

export async function addMatches(matchIds: string[]) {
  for (const matchId of matchIds)
    await addMatch(matchId);
}
