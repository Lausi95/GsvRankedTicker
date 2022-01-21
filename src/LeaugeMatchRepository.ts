import {createLogger} from "./Logging";

const logger = createLogger('LeaugeMatchRepository');

let repository: string[] = [];

export async function matchExists(matchId: string) {
  return !!repository.find(m => m === matchId);
}

export async function addMatch(matchId: string) {
  const exists = await matchExists(matchId);
  if (exists)
    return;
  logger.info(`Add match ${matchId}`);
  repository = [...repository, matchId];
}

export async function addMatches(matchIds: string[]) {
  for (const matchId of matchIds)
    await addMatch(matchId);
}
