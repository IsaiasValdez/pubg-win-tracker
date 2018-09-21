const Discord = require('discord.js');
const shortid = require('shortid');
const cloudinary = require('cloudinary');
const { serverNameDelimiter, maxMatchSearchAmount } = require('../config.json');
const Icons = require('../canvas/icons');
const { AccountConnections, MatchStats, UserMatches } = require('../dbObjects');
const PUBGAPI = require('../pubgapi');
const PUBGAPI_TOKEN = process.env.PUBGAPI_TOKEN;

// function to parse server name win counter
const parseServerName = (name, wins) => {
    // 
    if (name.split(serverNameDelimiter).length < 2) {
        return `${name}${serverNameDelimiter}${wins}`;
    }
    else {
        return `${name.split(serverNameDelimiter)[0]}${serverNameDelimiter}${wins}`;
    }
};

module.exports = {
    name: 'chickendinner',
    aliases: ['cd'],
    description: 'Winner Winner, Chicken Dinner!',
    guildOnly: true,
    args: true,
    usage: '<na/eu>',
    cooldown: 3,
    async execute(message, args) {
        // return if missing parameters
        if (args.length < 1) { return message.reply('missing parameters!'); }

        // get the guild id of message source
        const messageGuildID = message.guild.id;

        // get the message author discord id
        const messageUserID = message.author.id;

        // get guild's settings
        const settings = message.client.guildsettings.get(messageGuildID);

        // check if user has permission to use command
        const isOwner = (messageUserID === message.guild.ownerID);
        const isAdmin = message.member.permissions.has('MANAGE_GUILD');
        const isTracker = message.member.roles.has(settings.tracker_id);
        if (!isOwner && !isAdmin && !isTracker) { return message.reply(`you must have the <@&${settings.tracker_id}> role to use this command!`); }

        // init pubg api
        const pubgAPI = new PUBGAPI(PUBGAPI_TOKEN);

        // parse shard
        let shard = args[0].toLowerCase();
        if (shard === 'na') { shard = 'pc-na'; }
        else if (shard === 'eu') { shard = 'pc-eu'; }
        else { return message.reply('region not supported or specified!'); }

        // get the pubg player id associated to the message user
        const pubgAccountID = await AccountConnections.findOne({ 
            where: { guild_id: messageGuildID, discord_id: messageUserID },
        })
        .then(user => { return user.pubg_id; })
        .catch(() => { return null; });

        if(pubgAccountID == null) { return message.reply('you must have a connected PUBG account to do that!'); }

        // get author's recent pubg match ids
        const matchIDs = await pubgAPI.getRecentPlayerMatches(shard, pubgAccountID)
        .catch((errmsg) => {
            return message.reply(errmsg);
        });

        // get the match data of each match id
        const allMatchesData = await pubgAPI.getMatchesData(shard, matchIDs);

        // get the stats of players of a chicken dinner game
        const dinnersData = await pubgAPI.getStatsFromWins(allMatchesData, pubgAccountID);
        if (dinnersData.length < 1) { return message.reply(`no wins in last ${maxMatchSearchAmount} games!`); }

        // container to hold valid match ids
        const validChoices = [];

        // filter to only following messages by author
        const filter = (response) => {
            return message.author.id === response.author.id;
        };

        // iterate through each win's player's stats to output for registering
        for (let i = 0, totalMatches = dinnersData.length; i < totalMatches; i++) {
            // get the data related to current match, if true embed match image
            const recordedMatchData = await MatchStats.findOne({ where: { match_id: dinnersData[i].matchID } })
                .catch(console.error);
            
            // build embed from player stats
            const embed = new Discord.RichEmbed();
            embed.setTitle(`Match ID: ${i + 1}`);
            embed.setAuthor(`${message.guild.name}`, message.guild.iconURL);
            embed.setColor('#ffd147');
            // if match recorded embed match image, else add index as valid choice (index+1 for displaying)
            if (recordedMatchData == null) { validChoices.push(`${i + 1}`); }
            else if (settings.update_icon && recordedMatchData.image_url !== 'none') {
                embed.setThumbnail(recordedMatchData.image_url);
            }
            // get the current match's roster stats
            const dinnerPlayers = dinnersData[i].players;
            // add field of stats for each player
            for (let j = 0; j < dinnerPlayers.length; j++) {
                const currentPlayer = dinnerPlayers[j];
                embed.addField(
                    `${currentPlayer.playerName}`,
                    `Kills: ${currentPlayer.kills}
                    Assists: ${currentPlayer.assists}
                    Revives: ${currentPlayer.revives}
                    Damage Dealt: ${currentPlayer.damageDealt}`);
            }

            message.channel.send(embed);
        }

        // TODO: add pubg id to discord id connection
        // return;

        // console.log(validChoices);

        // place holder for selected match id to register
        let matchID = -1;

        // prompt user to choose a match to select
        await message.channel.send('Select a Match ID to register win: ').then(async () => {
            await message.channel.awaitMessages(filter, { maxMatches: 1, time: 15000, error: ['time'] })
                .then(collected => {
                    const choice = collected.first().content;
                    // check if message content included valid choice
                    if (validChoices.includes(`${choice}`)) {
                        // parse choice from string to int (- 1 from displayed id)
                        matchID = parseInt(choice) - 1;
                        message.reply(`registering Match ID: ${choice}!`);
                    }
                    else { message.reply('match already registered or invalid choice!'); }
                })
                .catch(() => {
                    // alert author they exceeded time limit
                    message.reply('canceling Chicken Dinner ;(');
                });
        });

        // exit if a valid match id was not selected
        if (matchID < 0) { return; }

        // store stats of selected match to register
        const chosenMatchStats = dinnersData[matchID];
        // store match id (real one, should rename) of selected match
        const chosenMatchID = chosenMatchStats.matchID;

        // create new icon canvas if settings permit, else null
        const newIcon = (settings.update_icon) ? await Icons.getIcon(settings.icon_style, settings.wins + 1).catch(console.error) : null;
        const uniqueID = shortid.generate();

        // upload icon to cloud for embedding, if update icon true
        if (newIcon !== null) {
            cloudinary.v2.uploader.upload_stream({
                resource_type: 'image',
                public_id: `${message.guild.id}-${uniqueID}`,
                folder: 'pubg_win_tracker',
            },
            function(error) { if(error) console.log(error); })
            .end(newIcon.toBuffer());
        }

        // build (expected) uploaded image url
        const imageURL = cloudinary.url(`pubg_win_tracker/${encodeURI(`${message.guild.id}-${uniqueID}`)}`, { resource_type: 'image' });

        // add match and its player's stats to database
        MatchStats.create({ 
            match_id: chosenMatchID,
            image_url: `${imageURL}`,
            player_1: JSON.stringify(chosenMatchStats.players[0], null, 2),
            player_2: (chosenMatchStats.players > 1) ? JSON.stringify(chosenMatchStats.players[1], null, 2) : null, 
            player_3: (chosenMatchStats.players > 2) ? JSON.stringify(chosenMatchStats.players[2], null, 2) : null,
            player_4: (chosenMatchStats.players > 3) ? JSON.stringify(chosenMatchStats.players[3], null, 2) : null,
        })
        .catch(console.error);

        // connect match to connected discord ids
        chosenMatchStats.players.map(playerStats => {
            if (playerStats.discordID) {
                UserMatches.create({
                    discord_id: playerStats.discordID,
                    match_id: chosenMatchID,
                })
                .catch(console.error);
            }
        });

        // increase guild's wins
        settings.wins += 1;

        try {
            // update database
            settings.save();

            message.reply('congrats!');

            // update server name if guild setting true
            if (settings.update_name) {
                message.guild.setName(parseServerName(message.guild.name, settings.wins));
            }
            // update server icon if guild setting true
            if (settings.update_icon) {
                message.guild.setIcon(newIcon.toBuffer());
            }
        }
        catch (err) {
            console.error(err);
            return message.reply('something went horribly wrong somewhere! SEND HELP!');
        }
    },
};