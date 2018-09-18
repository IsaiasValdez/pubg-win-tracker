const Icons = require('../canvas/icons');

module.exports = {
    name: 'iconstyles',
    aliases: ['styles', 'icons'],
    description: 'View available icon styles with examples. Set an icon style with the command `settings set IconStyle styleName`',
    guildOnly: false,
    args: false,
    usage: false,
    cooldown: 3,
    async execute(message) {
        const isManager = (message.author.id === message.guild.ownerID) ? true : message.member.permissions.has('MANAGE_GUILD', true);
        if (!isManager) { return message.reply('you must have the `Manage Server` permission to use this command!'); }

        message.reply('these are the available icon styles!');
        const iconStyles = Icons.getIconStyles();
        iconStyles.map(async style => {
            await message.channel.send(`**Style: **\`${style.name}\`\n**Description: **${style.description}`, 
            {
                file: style.example,
            });
        });
    },
};