const logger = require('./Logging').createLogger('PlayerRepository');

let repository = [];

async function addPlayer(player) {
  if (repository.find(p => p.puuid === player.puuid))
    return;
  logger.info(`saving player ${player.puuid}`);
  repository = [...repository, player];
}

async function removePlayer(player) {
  logger.info(`removing player ${player.puuid}`);
  repository = repository.filter(p => p !== player);
}

async function getPlayers() {
  return repository;
}

module.exports = {
  addPlayer: addPlayer,
  removePlayer: removePlayer,
  getPlayers: getPlayers,
};
