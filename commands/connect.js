const snekfetch = require('snekfetch');
const PUBGAPI_TOKEN = process.env.PUBGAPI_TOKEN;
const { AccountConnections } = require('../dbObjects');

module.exports = {
    name: 'connect',
    aliases: ['con'],
    description: 'Connect your Discord account to a PUBG account. `Manage_Server` members can change this.',
    guildOnly: false,
    args: true,
    usage: '<na/eu> <AccountName> <@user>',
    cooldown: 3,
    async execute(message, args) {
        if (args.length < 2) { return message.reply('missing parameters!'); }

        let shard = args[0].toLowerCase();
        if (shard === 'na') { shard = 'pc-na'; }
        else if (shard === 'eu') { shard = 'pc-eu'; }
        else { return message.reply('region not supported or specified!'); }

        const playerName = args[1];

        // get guild id of message
        const messageGuildID = message.guild.id;
        // get user id of mention or message author
        const messageUserID = (message.mentions.users.size > 0) ? message.mentions.users.first().id : message.author.id;

        // check if author has manage server permission to connect someone elses command
        const isManager = (message.author.id === message.guild.ownerID) ? true : message.member.permissions.has('MANAGE_GUILD', true);
        if (!isManager && (message.mentions.users.size > 0)) { return message.reply('you must have the `Manage Server` to set someone elses account!'); }

        // check if author has manage server permission to change a connection
        const connection = await AccountConnections.findOne({ where: { guild_id: messageGuildID, discord_id: messageUserID } });
        if (!isManager && connection) { return message.reply('Discord account already connected to a PUBG account! Contact an admin to have it changed!'); }

        await snekfetch.get(`https://api.playbattlegrounds.com/shards/${shard}/players?filter[playerNames]=${playerName}`, {
            headers: {
                'Authorization': `Bearer ${PUBGAPI_TOKEN}`,
                'Accept': 'application/json',
            },
        })
        .then(async r => {
            const pubgID = r.body.data[0].id;

            try {
                if (!connection) {
                    const newConnection = await AccountConnections.create({ guild_id: messageGuildID, discord_id: messageUserID, pubg_id: pubgID });
                    return message.reply(`<@${newConnection.discord_id}> connected to ${playerName}`);
                }
                else {
                    connection.pubg_id = pubgID;
                    connection.save()
                    .then(() => {
                        return message.reply(`<@${connection.discord_id}> connected to ${playerName}`);
                    })
                    .catch(err => {
                        console.error(err);
                        return message.reply('there was a problem updating the connection!');
                    });
                }
            }
            catch (err) {
                console.error(err);
                return message.reply('there was a problem connecting account!');
            }

            // console.log(r.body.data[0].id);
            // const { data [ list { attributes } ] } = r.body.data;
        })
        .catch(err => {
            // console.error(err);

            const statusCode = err.status;
            if (statusCode === 404) {
                return message.reply('PUBG account not found! Make sure name casing is accurate or try a different region!');
            }
            if (statusCode === 429) {
                return message.reply('too many requests! Please wait a minute and try again!');
            }
            if (statusCode === 401) {
                return message.reply('API authorization failure! Please contact the developer!');
            }
            if (statusCode === 415) {
                return message.reply('content type error! Please contact the developer!');
            }
        });

        /*
        const embed = new Discord.RichEmbed()
            .setColor('#efff00')
            .setTitle(answer.word)
            .setURL(answer.permalink)
            .addField('Definition', trim(answer.definition, 1024))
            .addField('Example', trim(answer.example, 1024))
            .addField('Rating', `${answer.thumbs_up} thumbs up.\n${answer.thumbs_down} thumbs down.`)
            .setFooter(`Tags: ${body.tags.join(', ')}`);

        message.channel.send(embed);
        */
    },
};