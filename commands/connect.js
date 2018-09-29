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

        // get pubg account id from pubg name
        const playerInfo = await pubgAPI.getPubgPlayer(shard, pubgName)
        .catch((errmsg) => {
            message.reply(errmsg);
            return null;
        });

        // cancel command if failed to retrieve pubg id
        if (playerInfo === null) { return; }

        // store discord id of message author
        const messageUserID = message.author.id;

        // get author's user data, if any
        const user = await User.findOne({ where: { discord_id: messageUserID } }).catch(console.error);

        // user exists in db
        if (user) {
            // update user pubg id
            user.pubg_id = playerInfo.id;
            user.pubg_name = playerInfo.name;
            user.save()
            .then(() => {
                return message.reply(`<@${user.discord_id}> connected to ${pubgName}`);
            })
            .catch((err) => {
                console.error(err);
                return message.reply('there was a problem updating the connection!');
            });
        }
        // user doesn't exists in db
        else {
            // create new user entry
            User.create({ discord_id: messageUserID, pubg_id: playerInfo.id, pubg_name: playerInfo.name })
            .then((newUser) => { return message.reply(`<@${newUser.discord_id}> connected to ${pubgName}`); })
            .catch((err) => {
                console.error(err);
                return message.reply('there was a problem connecting your account!');
            });
        }
    },
};