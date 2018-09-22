const PUBGAPI = require('../pubgapi');
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

        // init pubg api
        const pubgAPI = new PUBGAPI(PUBGAPI_TOKEN);

        // store pubg name
        const pubgName = args[1];

        // store discord id of message author
        const messageUserID = message.author.id;

        // get author's user data, if any
        const user = await User.findOne({ where: { discord_id: messageUserID } });

        const playerPubgID = await pubgAPI.getPubgPlayerID(shard, pubgName)
        .catch((errmsg) => { return message.reply(errmsg); });

        if (user) {
            user.pubg_id = playerPubgID;
            user.save()
            .then(() => {
                return message.reply(`<@${user.discord_id}> connected to ${pubgName}`);
            })
            .catch((err) => {
                console.error(err);
                return message.reply('there was a problem updating the connection!');
            });
        }
        else {
            const newUser = await User.create({ discord_id: messageUserID, pubg_id: playerPubgID });
            return message.reply(`<@${newUser.discord_id}> connected to ${pubgName}`);
        }
    },
};