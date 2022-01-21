import {createLogger} from "./Logging";

const logger = createLogger('ValorantMatchRepository');

let repository: string[] = [];

export async function matchExists(matchId: string) {
  return !!repository.find(m => m === matchId);
}

export async function addMatch(matchId: string) {
  const exists = await matchExists(matchId);
  if (exists)
    return;
  logger.info(`Added match ${matchId}`);
  repository = [...repository, matchId];
}
