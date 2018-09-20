'use strict';

const snekfetch = require('snekfetch');
const { AccountConnections } = require('./dbObjects');
const { maxMatchSearchAmount } = require('./config.json');
const bannedGamemodes = ['warmode', 'warmode-fpp'];

const isSolo = (mode) => {
    if (mode === 'solo' || mode === 'solo-fpp') { return true; }
    else { return false; }
};

class ChickenDinner {

    constructor(matchID, gamemode) {
        this.matchID = matchID;
        this.gamemode = gamemode;
        this.players = new Array();
    }

    addPlayer(playerData) {
        const player = {
            pubgID: playerData.playerId,
            playerName: playerData.name,
            kills: playerData.kills,
            assists: playerData.assists,
            revives: playerData.revives,
            damageDealt: parseInt(playerData.damageDealt),
        };

        this.players.push(player);
    }
}

class PUBGApi {

    constructor(authkey) {
        this.authkey = authkey;
    }

    // obtains match ids of player's recent games
    async getPlayerMatchIDs(shard, playerID) {
        return await snekfetch.get(`https://api.playbattlegrounds.com/shards/${shard}/players/${playerID}`, {
            headers: {
                'Authorization': `Bearer ${this.authkey}`,
                'Accept': 'application/json',
            },
        })
        .then(account => {
            // store matches data
            const matchesData = account.body.data.relationships.matches.data;
            // calculate slice amount to handle less than search amount of games
            const matchSearchAmount = (matchesData.length < maxMatchSearchAmount) ?
                                      maxMatchSearchAmount - (maxMatchSearchAmount - matchesData.length) :
                                      maxMatchSearchAmount;
            
            // console.log('Total Matches Searched: ' + matchSearchAmount);
            // return array of match ids
            return matchesData.slice(0, matchSearchAmount).map(m => m.id);
        })
        .catch(err => {
            const statusCode = err.status;
            switch (statusCode) {
                case 404:
                    // account not found
                    throw statusCode;
                case 429:
                    // request limit reached
                    console.log('Too many requests, raise the limit asap!');
                    throw statusCode;
                case 401:
                    // api authorization failure, uh oh
                    console.log('API authorization failure! Hope I didn\'t get banned!');
                    throw statusCode;
                case 415:
                    // content type error, no clue what that means really
                    console.log('Content type error!');
                    throw statusCode;
                default:
                    console.log(err);
                    throw -1;
            }
        });
    }

    // get match data on an array of match ids
    async getMatchesData(shard, matchIDs) {
        return Promise.all(matchIDs.map(id => {
            return this.requestMatchData(shard, id);
        }));
    }

    // request a match's data via a match id
    async requestMatchData(shard, matchID) {
        const matchData = await snekfetch.get(`https://api.playbattlegrounds.com/shards/${shard}/matches/${matchID}`, {
            headers: { 'Accept': 'application/json' },
        })
        .catch(err => {
            const statusCode = err.status;
            switch (statusCode) {
                case 404:
                    console.log('PUBG account not found! Make sure name casing is accurate or try a different region!');
                    break;
                case 429:
                    console.log('too many requests! Please wait a minute and try again!');
                    break;
                case 401:
                    console.log('API authorization failure! Please contact the developer!');
                    break;
                case 415:
                    console.log('content type error! Please contact the developer!');
                    break;
                default:
                    console.log(err);
            }

            return null;
        });

        return matchData;
    }

    // check if player won the match
    playerWonMatch(matchData, playerID) {
        // filter participants data from match data
        const matchParticipants = matchData.body.included.filter(object => object.type === 'participant');

        // find player ID in participants data
        for (let i = 0; i < matchParticipants.length; i++) {
            // store current particpant data
            const currentParticpant = matchParticipants[i];
            // check if current participant is the player
            if (currentParticpant.attributes.stats.playerId === playerID) {
                const currentStats = currentParticpant.attributes.stats;
                // check if player won game
                if (currentStats.winPlace === 1) {
                    return true;
                }
                else {
                    return false;
                }
            }
        }

        return false;
    }

    getStatsFromWins(matchesData, playerID) {
        // filter out non-chicken dinners from matches array
        const chickenDinnersData = matchesData.filter((mdata) => {
            return this.playerWonMatch(mdata, playerID);
        });

        // store dinners
        const dinnersPlayerStats = new Array();

        // iterate through dinners
        for (let i = 0, totalDinners = chickenDinnersData.length; i < totalDinners; i++) {
            // store current match data
            const currentMatchData = chickenDinnersData[i];
            // store current match id
            const currentMatchID = currentMatchData.body.data.id;
            // store current match gamemode for future use
            const currentMatchMode = currentMatchData.body.data.attributes.gameMod;

            // create a dinner to store match and player(s) info
            const dinner = new ChickenDinner(currentMatchID, currentMatchMode);

            // find and store participant ids of winning team
            const winningParticipantIDs = currentMatchData.body.included
                .filter(object => object.type === 'roster')
                .find(roster => roster.attributes.won === 'true')
                .relationships.participants.data.map(p => p.id);
            
            // iterate through roster participants
            for (let j = 0, totalIDs = winningParticipantIDs.length; j < totalIDs; j++) {
                // store participant data
                const currentPlayerData = currentMatchData.body.included.find(object => object.id === winningParticipantIDs[j]).attributes.stats;
                // add player data to current dinner
                dinner.addPlayer(currentPlayerData);
            }

            // add current dinner to dinners array
            dinnersPlayerStats.push(dinner);
        }

        // return dinners array
        return dinnersPlayerStats;
    }

    async getStatsFromDinners(matchesData, playerID, guildID) {
        this.getStatsFromWins(matchesData, playerID);
        return;
        const allMatchesParts = matchesData.map(mdata => {
            return mdata.body.included.filter(object => object.type === 'participant');
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
                    const matchRosters = currentMatchData.body.included.filter(object => object.type === 'roster');
                    
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