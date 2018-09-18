'user strict';

const snekfetch = require('snekfetch');
const { AccountConnections } = require('./dbObjects');
const { matchSearchAmount } = require('./config.json');
const bannedGamemodes = ['warmode', 'warmode-fpp'];

const isSolo = (mode) => {
    if (mode === 'solo' || mode === 'solo-fpp') { return true; }
    else { return false; }
};

class PUBGApi {

    constructor(authkey) {
        this.authkey = authkey;
    }

    async getPlayerMatchIDs(shard, playerID) {
        if (matchSearchAmount > 30) { return false; }
        // console.log('starting');

        return await snekfetch.get(`https://api.playbattlegrounds.com/shards/${shard}/players/${playerID}`, {
            headers: {
                'Authorization': `Bearer ${this.authkey}`,
                'Accept': 'application/json',
            },
        })
        .then(account => {
            // get last ids of last 10 matches
            // console.log('success');
            // console.log(account.body.data.relationships.matches.data.slice(0, amount).map(m => m.id));
            return account.body.data.relationships.matches.data.slice(0, matchSearchAmount).map(m => m.id);
        })
        .catch(err => {
            // console.log('problem!');
            const statusCode = err.status;
            // console.log(statusCode);
            if (statusCode === 404) {
                // return message.reply('PUBG account not found! Make sure name casing is accurate or try a different region!');
            }
            else if (statusCode === 429) {
                // return message.reply('too many requests! Please wait a minute and try again!');
            }
            else if (statusCode === 401) {
                // return message.reply('API authorization failure! Please contact the developer!');
            }
            else if (statusCode === 415) {
                // return message.reply('content type error! Please contact the developer!');
            }
            else {
                // console.error(err);
            }
            return false;
        });
    }

    async getMatchesData(shard, matchIDs) {
        return await Promise.all(matchIDs.map(async id => {
            const requestMatch = await snekfetch.get(`https://api.playbattlegrounds.com/shards/${shard}/matches/${id}`, {
                headers: { 'Accept': 'application/json' },
            })
            .catch(err => {
                const statusCode = err.status;
                if (statusCode === 404) {
                    // return message.reply('PUBG account not found! Make sure name casing is accurate or try a different region!');
                }
                else if (statusCode === 429) {
                    // return message.reply('too many requests! Please wait a minute and try again!');
                }
                else if (statusCode === 401) {
                    // return message.reply('API authorization failure! Please contact the developer!');
                }
                else if (statusCode === 415) {
                    // return message.reply('content type error! Please contact the developer!');
                }
                else {
                    // console.error(err);
                    console.log(`Status: ${statusCode}`);
                }

                return statusCode;
            });

            return requestMatch;
        }));
    }

    async getStatsFromDinners(matchesData, playerID, guildID) {
        const allMatchesParts = matchesData.map(mdata => {
            return mdata.body.included.filter(object => object.type == 'participant');
        });

        // track which games are wins and thus need to be checked
        const matchesResults = [];
        // track user's participant ids in matches
        const matchesPartID = [];

        // iterate over all matches participants arrays
        for(let i = 0; i < allMatchesParts.length; i++) {
            // get the current match participants array
            const currentMatchParts = allMatchesParts[i];
            // iterate through match participants
            for (let j = 0; j < currentMatchParts.length; j++) {
                const currentPlayer = currentMatchParts[j];
                // check if current player is message author's connected account
                if (currentPlayer.attributes.stats.playerId === playerID) {
                    const currentStats = currentPlayer.attributes.stats;
                    // check if player won game
                    if (currentStats.winPlace === 1) {
                        // add match as win
                        matchesResults.push(true);
                        matchesPartID.push(currentPlayer.id);
                    }
                    else {
                        // add match as loss
                        matchesResults.push(false);
                        matchesPartID.push(currentPlayer.id);
                    }
                    // end current match participants search early if author's account found
                    break;
                }
            }
        }

        // console.log(matchesResults);
        // console.log(matchesPartID);

        // store the stats datas of winning roster (roster that player is in)
        const playersStatsData = [];

        // iterate through all matches to get stats
        for (let i = 0; i < matchesData.length; i++) {
            const gamemode = matchesData[i].body.data.attributes.gameMod;
            // check if match is win before before doing anything, else skip
            if (matchesResults[i]) {
                // console.log(`Checking game: ${i + 1}`);
                // container for winning player stats of current match
                const winningPartsStats = [];
                // get current match's data
                const currentMatchData = matchesData[i];
                if (!isSolo(gamemode)) {
                    // get current match's rosters
                    const matchRosters = currentMatchData.body.included.filter(object => object.type == 'roster');
                    // get winning roster (should be the roster of message author's account)
                    const winningRoster = matchRosters.find(roster => roster.attributes.won === 'true');
                    // get participants of roster
                    const winningPartsIDs = winningRoster.relationships.participants.data.map(p => p.id);
                    // iterate through winning participants id to scrape for stats
                    for (let j = 0; j < winningPartsIDs.length; j++) {
                        // get id of current winning participant
                        const currentPartID = winningPartsIDs[j];
                        // get stats of current winning participant
                        const currentPartStats = currentMatchData.body.included.find(object => object.id === currentPartID).attributes.stats;
                        // push stats to array
                        winningPartsStats.push(currentPartStats);
                    }
                }
                else {
                    const playerStats = currentMatchData.body.included.find(object => object.id === matchesPartID[i]).attributes.stats;
                    winningPartsStats.push(playerStats);
                }

                playersStatsData.push(winningPartsStats);
            }
            else {
                playersStatsData.push(false);
            }
        }

        // add discord id to connected accounts
        const guildConnections = await AccountConnections.findAll({ where: { 
            guild_id: guildID,
        } })
        .catch(console.error);

        // store the tracked stats of winning players and connected accounts
        const matchesPlayerStats = [];

        // iterate over matches data and connect discord ids to connected accounts
        for (let i = 0; i < matchesData.length; i++) {
            // check if match was win, else skip
            if (matchesResults[i] === true) {
                // container to holder stats of each player
                const rosterStats = [];
                // get current match data
                const currentMatchData = matchesData[i];
                // get the stats of the winning roster array
                const matchRosterStats = playersStatsData[i];
                // iterate over the winning roster
                for (let j = 0; j < matchRosterStats.length; j++) {
                    // output stats of current player
                    const currentPlayerStats = matchRosterStats[j];
                    const connectedIndex = guildConnections.findIndex(c => c.pubg_id === currentPlayerStats.playerId);
                    const discordAccountID = (connectedIndex >= 0) ? guildConnections[connectedIndex].discord_id : false;

                    const playerStats = {
                        matchID: currentMatchData.body.data.id,
                        pubgID: currentPlayerStats.playerId,
                        playerName: currentPlayerStats.name,
                        kills: currentPlayerStats.kills,
                        assists: currentPlayerStats.assists,
                        revives: currentPlayerStats.revives,
                        damageDealt: parseInt(currentPlayerStats.damageDealt),
                        discordID: discordAccountID,
                    };
                    rosterStats.push(playerStats);
                }

                matchesPlayerStats.push(rosterStats);
            }
        }
        // console.log(matchesPlayerStats);
        return matchesPlayerStats;
    }
}

module.exports = PUBGApi;