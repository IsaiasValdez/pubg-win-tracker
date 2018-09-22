const { GuildSettings } = require('../dbObjects');
const Icons = require('../canvas/icons');
const { serverNameDelimiter } = require('../config.json');

const parseServerName = (name, wins) => {
    if (name.split(serverNameDelimiter).length < 2) {
        return `${name}${serverNameDelimiter}${wins}`;
    }
    else {
        return `${name.split(serverNameDelimiter)[0]}${serverNameDelimiter}${wins}`;
    }
};

module.exports = {
    name: 'settings',
    aliases: ['config', 'set'],
    description: 'View or change bot settings',
    guildOnly: true,
    args: true,
    usage: '[UpdateServeName/UpdateServerIcon] <true/false>,\n[Wins] <number>,\n[IconStyle] <StyleName>,\n[viewall]',
    cooldown: 3,
    async execute(message, args) {
        // shorthand function for message.channel.send()
        const send = (content) => { message.channel.send(content); };

        // check if message user has manage server permissions
        const isManager = (message.author.id === message.guild.ownerID) ? true : message.member.permissions.has('MANAGE_GUILD', true);
        if (!isManager) { return message.reply('you must have the `Manage Server` permission to change settings!'); }

        // get sub-command
        const cmd = args[0].toLowerCase();

        // get the guild id where message came from
        const messageGuildID = message.guild.id;

        // get the guild's settings
        const settings = await message.client.guildsettings.get(messageGuildID);

        // manually set wins counter
        if (cmd === 'wins') {
            // parse win integer
            const settingValue = parseInt([args[1]]);
            // validate integer is valid
            if (settingValue < 0 || settingValue > Number.MAX_SAFE_INTEGER || Number.isNaN(settingValue)) { return message.reply('haha, very funny, cunt!'); }

            // set guild's wins to settingValue
            settings.wins = settingValue;
            try {
                // update database
                settings.save();

                // update server name of win change if setting true
                if (settings.update_name) {
                    message.guild.setName(parseServerName(message.guild.name, settingValue));
                }
                // update server icon of win change if setting true
                if (settings.update_icon) {
                    const newIcon = await Icons.getIcon(settings.icon_style, settingValue);
                    message.guild.setIcon(newIcon.toBuffer()).then(console.log());
                }

                // alert user of changes
                return send(`\`${cmd}\` has been \`set\` to \`${settingValue}\``); 
            }
            catch (err) {
                console.error(err);
                return message.reply(`Could not change \`${cmd}\`!`);
            }
        }
        // set whether server name should update
        if (cmd === 'updateservername') {
            // parse boolean
            const settingBoolean = (args[1].toLowerCase() === 'true') ? true : false;
            // set guild's update name to boolean
            settings.update_name = settingBoolean;
            try {
                // update database
                settings.save();
                // update server name if setting true
                if (settingBoolean) {
                    message.guild.setName(parseServerName(message.guild.name, settings.wins));
                }

                // alert user of changes
                return send(`\`${cmd}\` has been \`set\` to \`${settingBoolean}\``); 
            }
            catch (err) {
                console.error(err);
                return message.reply(`Could not change \`${cmd}\`!`);
            }
        }
        // set whether server icon should update
        if (cmd === 'updateservericon') {
            // parse boolean
            const settingBoolean = (args[1].toLowerCase() === 'true') ? true : false;
            // set guild's update icon to boolean
            settings.update_icon = settingBoolean;
            try {
                // update database
                settings.save();
                // update server icon if setting true
                if (settingBoolean) {
                    const newIcon = await Icons.getIcon(settings.icon_style, settings.wins);
                    message.guild.setIcon(newIcon.toBuffer()).then(console.log());
                }

                // alert user of changes
                return send(`\`${cmd}\` has been \`set\` to \`${settingBoolean}\``); 
            }
            catch (err) {
                console.error(err);
                return message.reply(`Could not change \`${cmd}\`!`);
            }
        }
        // set icon style
        if (cmd === 'iconstyle') {
            // get chosen style name
            const styleName = args[1].toLowerCase();
            // validate that icon style exists
            const iconStyle = Icons.getIconStyles(true).get(styleName);
            if (!iconStyle) { return message.reply(`could not find icon style: \`${styleName}\`! Use command \`iconstyles\` to view available styles!`); }
            
            // set guild's icon style to chosen style name
            settings.icon_style = styleName;
            try {
                // update database
                settings.save();
                // update icon if setting true
                if (settings.update_icon) {
                    const newIcon = await Icons.getIcon(styleName, settings.wins);
                    message.guild.setIcon(newIcon.toBuffer()).then(console.log());
                }

                // alert user of changes
                return send(`\`${cmd}\` has been \`set\` to \`${styleName}\``); 
            }
            catch (err) {
                console.error(err);
                return message.reply(`Could not change \`${cmd}\`!`);
            }
        }
        if (cmd === 'autoupdatewins') {
            // parse boolean
            const settingBoolean = (args[1].toLowerCase() === 'true') ? true : false;
            // set guild's auto update wins to boolean
            settings.auto_update_wins = settingBoolean;
            try {
                // update database
                settings.save();

                // alert user of changes
                return send(`\`${cmd}\` has been \`set\` to \`${settingBoolean}\``);
            }
            catch (err) {
                console.error(err);
                return message.reply(`could not change \`${cmd}\`!`);
            }
        }
        // alert user that tracker role can't be changed
        if (cmd === 'trackerrole') {
            return message.reply('Tracker role cannot be changed! Edit the pre-made Tracker role through the Discord server settings!');
        }
        // view all settings
        if (cmd === 'viewall') {
            message.reply(`retrieving settings for Server: \`${messageGuildID}\``);
            // check if guild has settings
            if (settings) {
                const settingsList = [ 
                    `**Server Wins**: \`${settings.wins}\``,
                    `**Update Server Name**: \`${settings.update_name}\``,
                    `**Update Server Icon**: \`${settings.update_icon}\``,
                    `**Icon Style**: \`${settings.icon_style}\``,
                    `**(WIP) Auto Update Wins**: \`${settings.auto_update_wins}\``,
                    `**Tracker Role**: <@&${settings.tracker_id}>`,
                ];
                return send(`Settings for Server: \`${messageGuildID}\`\n${settingsList.join('\n')}`);
            }
            return send(`No settings found for Server: \`${messageGuildID}\``);
        }
        // manually register a guild to the database (debug only)
        if (cmd === 'register') {
            if(!settings) {
                const newSettings = await GuildSettings.create({ guild_id: message.guild.id });
                message.client.guildsettings.set(messageGuildID, newSettings);
                console.log(`Server: ${message.guild.id} - Settings added!`);

                message.guild.createRole({
                    name: 'Trackers',
                    mentionable: true,
                })
                .then(role => {
                    console.log(`Created new role with name ${role.name}`);
                    newSettings.tracker_id = role.id;
                    try {
                        newSettings.save();
        
                        return send(`\`tracker_id\` has been \`set\` to <@&${role.id}>`); 
                    }
                    catch (err) {
                        console.error(err);
                        return message.reply(`could not change \`${cmd}\`!`);
                    }
                })
                .catch(console.error);
                
                return message.reply(`settings for Server: \`${messageGuildID}\` created!`);
            }
        }

        return message.reply(`\`${cmd}\` does not exists!`);
    },
};