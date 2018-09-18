module.exports = {
    name: 'server',
    description: 'Outputs server information.',
    args: false,
    execute(message) {
        message.channel.send(`**Server Name**: ${message.guild.name}`);
        message.channel.send(`**Server ID**: \`${message.guild.id}\``);
    },
};