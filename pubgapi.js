'use strict';

const snekfetch = require('snekfetch');
const { maxMatchSearchAmount } = require('./config.json');

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

    async getPubgPlayerID(shard, pubgName) {
        return await snekfetch.get(`https://api.playbattlegrounds.com/shards/${shard}/players?filter[playerNames]=${pubgName}`, {
            headers: {
                'Authorization': `Bearer ${this.authkey}`,
                'Accept': 'application/json',
            },
        })
        .then(async data => {
            const pubgID = data.body.data[0].id;
            return pubgID;
        })
        .catch((err) => {
            const statusCode = err.status;
            let statusMessage = null;
            switch (statusCode) {
                case 404:
                    // account not found
                    statusMessage = 'PUBG account not found! Make sure your account name is case-accurate or try a different region!';
                    break;
                case 429:
                    // request limit reached
                    statusMessage = 'Too many requests! Please wait a minute and try again.';
                    console.error('Too many requests, raise the limit asap!');
                    break;
                case 401:
                    // api authorization failure, uh oh
                    statusMessage = 'API authorization failure! Please contact the developer!';
                    console.error('API authorization failure! Hope I didn\'t get banned!');
                    break;
                case 415:
                    // content type error, no clue what that means really
                    statusMessage = 'Content type error! Please contact the developer!';
                    console.error('Content type error!');
                    break;
                default:
                    statusMessage = 'Unknown error! Please contact the developer!';
                    console.error(err);
            }

            throw statusMessage;
        });
    }

    // obtains match ids of player's recent games
    async getRecentPlayerMatches(shard, playerID) {
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
        .catch((err) => {
            const statusCode = err.status;
            let statusMessage = null;
            switch (statusCode) {
                case 404:
                    // account not found
                    statusMessage = 'PUBG account not found! Make sure your account name is case-accurate or try a different region!';
                    break;
                case 429:
                    // request limit reached
                    statusMessage = 'Too many requests! Please wait a minute and try again.';
                    console.error('Too many requests, raise the limit asap!');
                    break;
                case 401:
                    // api authorization failure, uh oh
                    statusMessage = 'API authorization failure! Please contact the developer!';
                    console.error('API authorization failure! Hope I didn\'t get banned!');
                    break;
                case 415:
                    // content type error, no clue what that means really
                    statusMessage = 'Content type error! Please contact the developer!';
                    console.error('Content type error!');
                    break;
                default:
                    statusMessage = 'Unknown error! Please contact the developer!';
                    console.error(err);
            }

            throw statusMessage;
        });
    }

    // get match data on an array of match ids
    // TODO: Add error handling???
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
                    console.error('Match not found!');
                    break;
                case 401:
                    console.error('API authorization failure!');
                    break;
                case 415:
                    console.error('Content type error!');
                    break;
                default:
                    console.error(err);
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
}

module.exports = PUBGApi;