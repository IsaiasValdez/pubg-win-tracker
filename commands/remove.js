const { GuildSettings } = require('../dbObjects');

module.exports = {
    name: 'remove',
    aliases: ['rm', 'delete', 'uninstall'],
    description: 'Removes the bot from the server and ***deletes all data related to the server***.',
    guildOnly: true,
    args: false,
    usage: false,
    cooldown: 3,
    async execute(message) {
        // validate if user has manage server permission
        const isManager = (message.author.id === message.guild.ownerID) ? true : message.member.permissions.has('MANAGE_GUILD', true);
        if (!isManager) { return message.reply('you must have the `Manage Server` permission to use this command!'); }

        // get the guild id of message
        const messageGuildID = message.guild.id;

        // get the guildsettings of guild message
        const settings = message.client.guildsettings.get(messageGuildID);

        // validate that guild has settings
        if (settings) {
            // attempt to delete record of guild's settings in database
            const rowCount = await GuildSettings.destroy({ where: { guild_id: messageGuildID } });
            // validate that deletion succeeded
            if (rowCount) { console.log(`Server ${messageGuildID} - Settings deleted in database!`); }
            else { console.log(`Server ${messageGuildID} - There was a problem deleting settings in database!`); }

            // attempt to delete guild's settings from collection
            const result = message.client.guildsettings.delete(messageGuildID);
            // validate that deletion succeeded
            if (result) { console.log(`Server: ${messageGuildID} - Settings deleted in collection!`); }
            else { console.log(`Server ${messageGuildID} - There was a problem deleting settings in collection!`); }

            // validate that bot has permissions to delete created Tracker role
            const hasRolePermission = message.member.guild.me.hasPermission('MANAGE_ROLES', true);
            const trackerRole = message.guild.roles.get(settings.tracker_id);
            // delete bot created tracker role
            if (hasRolePermission && trackerRole.editable) {
                trackerRole.delete('Bot removed from server!')
                .then(deleted => console.log(`Server: ${messageGuildID} - Deleted role ${deleted.name}`))
                .catch(console.error);
            }
            else { message.reply('missing permissions to delete Tracker role! Must be done manually!'); }

            // finally leave server
            message.guild.leave()
            .then(console.log(`Server: ${messageGuildID} - Left server!`))
            .catch(console.error);
        }
    },
};