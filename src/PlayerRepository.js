// TODO replace with a database
const { RiotAPI, PlatformId } = require('@fightmegg/riot-api');

let repository = [];

// TODO move player resolving to a different location, since this is only to save the players
/**
 * @param {string} summonerName
 * @returns {Promise<void>}
 */
async function addPlayer(summonerName) {
	try {
		console.log(`Adding ${summonerName} to the database...`);
		const rAPI = new RiotAPI(process.env.RIOT_API_KEY);
		const summoner = await rAPI.summoner.getBySummonerName({
			region: PlatformId.EUW1,
			summonerName: summonerName,
		});
		console.log(`Player ${summonerName} successfully resolved. PUUID: ${summoner.puuid}`);
		repository = [...repository, summoner];
	}
	catch (err) {
		console.error(`player ${summonerName} could not be added to the database`);
	}
}

/**
 * @param {string} summonerName
 * @returns {Promise<void>}
 */
async function removePlayer(summonerName) {
	repository = repository.filter(p => p.name !== summonerName);
}

/**
 * @returns {Promise<RiotAPITypes.Summoner.SummonerDTO>}
 */
async function getPlayers() {
	return repository;
}

module.exports = {
	addPlayer: addPlayer,
	removePlayer: removePlayer,
	getPlayers: getPlayers,
};
