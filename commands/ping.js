module.exports = {
    name: 'ping',
    description: 'Ping Pong King Dong',
    guildOnly: false,
    args: false,
    usage: false,
    cooldown: 3,
    execute(message) {
        message.channel.send('Pong!');
    },
};