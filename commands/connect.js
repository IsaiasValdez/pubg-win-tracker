const snekfetch = require('snekfetch');
const PUBGAPI_TOKEN = process.env.PUBGAPI_TOKEN;
const { User } = require('../dbObjects');

module.exports = {
    name: 'connect',
    aliases: ['link'],
    description: 'Connect your Discord account to a PUBG account. `Manage_Server` members can change this.',
    guildOnly: false,
    args: true,
    usage: '<na/eu> <AccountName>',
    cooldown: 3,
    async execute(message, args) {
        if (args.length < 2) { return message.reply('missing parameters!'); }

        let shard = args[0].toLowerCase();
        if (shard === 'na') { shard = 'pc-na'; }
        else if (shard === 'eu') { shard = 'pc-eu'; }
        else { return message.reply('region not supported or specified!'); }

        // store pubg name
        const pubgName = args[1];

        // store discord id of message author
        const messageUserID = message.author.id;

        // get author's user data, if any
        const user = await User.findOne({ where: { discord_id: messageUserID } });

        // TODO: fill out comment
        await snekfetch.get(`https://api.playbattlegrounds.com/shards/${shard}/players?filter[playerNames]=${pubgName}`, {
            headers: {
                'Authorization': `Bearer ${PUBGAPI_TOKEN}`,
                'Accept': 'application/json',
            },
        })
        .then(async r => {
            const pubgID = r.body.data[0].id;

            try {
                if (user == null) {
                    const newUser = await User.create({ discord_id: messageUserID, pubg_id: pubgID });
                    return message.reply(`<@${newUser.discord_id}> connected to ${pubgName}`);
                }
                else {
                    user.pubg_id = pubgID;
                    user.save()
                    .then(() => {
                        return message.reply(`<@${user.discord_id}> connected to ${pubgName}`);
                    })
                    .catch((err) => {
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
    },
};