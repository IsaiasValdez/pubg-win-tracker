const Discord = require('discord.js');
const shortid = require('shortid');
const cloudinary = require('cloudinary');
const { serverNameDelimiter, maxMatchSearchAmount } = require('../config.json');
const Icons = require('../canvas/icons');
const { ChickenDinner, User } = require('../dbObjects');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
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
        const pubgAccountID = await User.findOne({ 
            where: { discord_id: messageUserID },
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

        const allDinnerIDs = dinnersData.map((dinner) => dinner.matchID);

        const registeredDinners = await ChickenDinner.findAll({
            attributes: ['match_id', 'image_url'],
            where: {
                match_id: {
                    [Op.or]: allDinnerIDs,
                },
            },
        }).catch(console.error);

        // iterate through each win's player's stats to output for registering
        for (let i = 0, totalMatches = dinnersData.length; i < totalMatches; i++) {
            // build embed from player stats
            const embed = new Discord.RichEmbed();
            embed.setTitle(`Match ID: ${i + 1}`);
            embed.setAuthor(`${message.guild.name}`, message.guild.iconURL);
            embed.setColor('#ffd147');
            // if match recorded embed match image, else add index as valid choice (index+1 for displaying)
            const existingDinnerData = registeredDinners.find((dinner) => dinner.match_id === dinnersData[i].matchID);
            if (existingDinnerData) {
                embed.setThumbnail(existingDinnerData.image_url);
            }
            else {
                validChoices.push(`${i + 1}`);
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
        const chosenMatch = dinnersData[matchID];

        // create new icon canvas if settings permit, else null
        const newIcon = (settings.update_icon) ? await Icons.getIcon(settings.icon_style, settings.wins + 1).catch(console.error) : null;
        let uniqueID = null;
        let imageURL = null;

        // upload icon to cloud for embedding, if update icon true
        if (newIcon) {
            uniqueID = shortid.generate();

            cloudinary.v2.uploader.upload_stream({
                resource_type: 'image',
                public_id: `${message.guild.id}-${uniqueID}`,
                folder: 'pubg_win_tracker',
                async: true,
            }, (err) => { if (err) { console.error(err); } })
            .end(newIcon.toBuffer());

            imageURL = cloudinary.url(`pubg_win_tracker/${encodeURI(`${message.guild.id}-${uniqueID}`)}`, { resource_type: 'image' });
        }

        // add dinner and its player's stats to database
        const dinner = await ChickenDinner.create({ 
            match_id: chosenMatch.matchID,
            image_url: imageURL,
            player_1: JSON.stringify(chosenMatch.players[0], null, 2),
            player_2: (chosenMatch.players.length > 1) ? JSON.stringify(chosenMatch.players[1], null, 2) : null, 
            player_3: (chosenMatch.players.length > 2) ? JSON.stringify(chosenMatch.players[2], null, 2) : null,
            player_4: (chosenMatch.players.length > 3) ? JSON.stringify(chosenMatch.players[3], null, 2) : null,
        })
        .catch(console.error);

        // get player pubg ids from dinner
        const playerPubgIDs = chosenMatch.players.map((player) => player.pubgID);

        // find all users in db by their pubg id
        const connectedUsers = await User.findAll({
            where: {
                pubg_id: {
                    [Op.or]: playerPubgIDs,
                },
            },
        })
        .catch(console.error);

        // add dinner to users found
        dinner.addUsers(connectedUsers);

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