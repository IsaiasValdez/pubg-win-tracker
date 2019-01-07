const { User } = require('../dbObjects');

// const trim = (str, max) => (str.length > max) ? `${str.slice(0, max - 3)}...` : str;

module.exports = {
    name: 'profile',
    aliases: ['me'],
    description: 'Get link to a user\'s profile.',
    guildOnly: false,
    args: false,
    usage: '<@user>',
    cooldown: 3,
    async execute(message) {
        const websiteURL = 'https://pubg-win-tracker-server.herokuapp.com/players/';

        // get a user's discord id
        const userID = (message.mentions.users.size > 0) ? message.mentions.users.first().id : 
            message.author.id;
        // return if no mention was found
        if (!userID) { return message.reply('no @user mention found!'); }

        // get the pubg player id associated to the message user
        const userConnected = await User.findOne({ 
            where: { discord_id: userID },
        })
        .catch((error) => console.error(error));

        // return if an  discord user has no pubg account connected
        if (!userConnected) { return message.reply(`<@${userID}> has no PUBG account connected!`); }

        message.reply(`${websiteURL}${userID}`);
    },
};