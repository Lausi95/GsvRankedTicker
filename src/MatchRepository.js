// TODO replace with a database
let repository = [];

async function matchExists(matchId) {
	return !!repository.find(m => m === matchId);
}

async function addMatch(matchId) {
	const exists = await matchExists(matchId);
	if (exists) {
		return;
	}
	console.log(`Added match ${matchId}`);
	repository = [...repository, matchId];
}

module.exports = {
	matchExists: matchExists,
	addMatch: addMatch,
};
