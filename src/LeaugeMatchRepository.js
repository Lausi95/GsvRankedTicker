const logger = require('./Logging').createLogger('LeaugeMatchRepository');

// TODO replace with a database
let repository = [];

async function matchExists(matchId) {
  return !!repository.find(m => m === matchId);
}

async function addMatch(matchId) {
  const exists = await matchExists(matchId);
  if (exists)
    return;
  logger.info(`Add match ${matchId}`);
  repository = [...repository, matchId];
}

async function addMatches(matchIds) {
  for (const matchId of matchIds)
    await addMatch(matchId);
}

module.exports = {
  matchExists,
  addMatches,
  addMatch,
};
