const Discord = require('discord.js');
const { AccountConnections } = require('../dbObjects');
const PUBGAPI = require('../pubgapi');
const PUBGAPI_TOKEN = process.env.PUBGAPI_TOKEN;

// const trim = (str, max) => (str.length > max) ? `${str.slice(0, max - 3)}...` : str;

module.exports = {
    name: 'playerstats',
    aliases: ['ps'],
    description: 'Get a connected Discord player\'s PUBG stats.',
    guildOnly: false,
    args: true,
    usage: '<na/eu> <@user>',
    cooldown: 3,
    async execute(message, args) {

        return;
        // return if missing parameters
        if (args.length < 2) { return message.reply('missing parameters!'); }

        const pubgAPI = new PUBGAPI(PUBGAPI_TOKEN);

        // parse shard
        let shard = args[0].toLowerCase();
        if (shard === 'na') { shard = 'pc-na'; }
        else if (shard === 'eu') { shard = 'pc-eu'; }
        else { return message.reply('region not supported or specified!'); }

        // get guild id of message
        const messageGuildID = message.guild.id;
        // get user id of mention 
        const messageUserID = (message.mentions.users.size > 0) ? message.mentions.users.first().id : false;
        // return if no mention was found
        if (!messageUserID) { return message.reply('no @user mention found!'); }

        // get the pubg player id associated to the message user
        const pubgAccountID = await AccountConnections.findOne({ 
            where: { guild_id: messageGuildID, discord_id: messageUserID },
        })
        .then(user => { return user.pubg_id; })
        .catch(() => { return false; });

        // return if an id was not found
        if (!pubgAccountID) { return message.reply(`<@${messageUserID}> has no account connected!`); }

        const matchIDs = await pubgAPI.getPlayerMatchIDs(shard, pubgAccountID, 10);
        if (matchIDs === 404) {
            return message.reply('PUBG account not found! Make sure name casing is accurate or try a different region!');
        }
        else if (matchIDs === 429) {
            return message.reply('too many requests! Please wait a minute and try again!');
        }
        else if (matchIDs === 401) {
            return message.reply('API authorization failure! Please contact the developer!');
        }
        else if (matchIDs === 415) {
            return message.reply('content type error! Please contact the developer!');
        }

        const allMatchesData = await pubgAPI.getMatchesData(shard, matchIDs);
        if (allMatchesData === 404) {
            return message.reply('PUBG account not found! Make sure name casing is accurate or try a different region!');
        }
        else if (allMatchesData === 429) {
            return message.reply('too many requests! Please wait a minute and try again!');
        }
        else if (allMatchesData === 401) {
            return message.reply('API authorization failure! Please contact the developer!');
        }
        else if (allMatchesData === 415) {
            return message.reply('content type error! Please contact the developer!');
        }

        const winMatchesPlayerStats = await pubgAPI.getStatsFromDinners(allMatchesData, pubgAccountID, messageGuildID);

        for (let i = 0; i < winMatchesPlayerStats.length; i++) {
            const embed = new Discord.RichEmbed();
            const rosterStats = winMatchesPlayerStats[i];
            embed.setTitle(`Match ID: ${i + 1}`);
            embed.setColor('#ff0000');
            for (let j = 0; j < rosterStats.length; j++) {
                const currentPlayer = rosterStats[j];
                const playerName = currentPlayer.playerName;
                embed.addField(`${playerName}`, `Kills: ${currentPlayer.kills}\nAssists: ${currentPlayer.assists}\nRevives: ${currentPlayer.revives}\nDamage Dealt: ${currentPlayer.damageDealt}`);
            }
            message.channel.send(embed);
        }
    },
};