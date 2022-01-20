const logger = require('./Logging').createLogger('ValorantMatchRepository');

let repository = [];

async function matchExists(matchId) {
  return !!repository.find(m => m === matchId);
}

async function addMatch(matchId) {
  const exists = await matchExists(matchId);
  if (exists)
    return;
  logger.info(`Added match ${matchId}`);
  repository = [...repository, matchId];
}

module.exports = {
  matchExists: matchExists, addMatch: addMatch,
};
