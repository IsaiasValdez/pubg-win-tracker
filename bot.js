// requires
const fs = require('fs');
const Discord = require('discord.js');
const memjs = require('memjs');
const { prefix } = require('./config.json');
const { GuildSettings } = require('./dbObjects');

// discord api token
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// setup client
const client = new Discord.Client();

const mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
    failover:true,
    timeout: 1,
    keepAlive: true,
});

client.mc = mc;

// setup commands
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// load command files
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// track command cooldowns
const cooldowns = new Discord.Collection();

// load available guild settings
client.guildsettings = new Discord.Collection();

// start bot
client.once('ready', async () => {
    // load all guild settings db models
    const storedSettings = await GuildSettings.findAll();
    storedSettings.forEach(gs => client.guildsettings.set(gs.guild_id, gs));

    client.user.setPresence({
        status: 'online',
        game: { name: `${prefix}help` },
    });

    console.log(`Logged in as ${client.user.tag}!`);
});

// read messages
client.on('message', async message => {
    // exit early if message not a command or message author is bot
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // get arg array with single-spacing
    const args = message.content.slice(prefix.length).split(/ +/);

    // get command name
    const commandName = args.shift();

    // get command action by command name or alias
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    // exit early if command doesn't exist
    if (!command) return;

    // check if user asks for a command that can only be used in a guild
    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply('I can\'t execute that command inside DMs!');
    }

    // exit early if command is guild only and guild is down
    if (command.guildOnly && !message.guild.available) { return console.error(`Server: ${message.guild.id} - Unavailable!`); }

    // alert user if command used incorrectly
    if (command.args && !args.length) {
        let reply = `Incorrect usage, ${message.author}!`;

        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }

        return message.channel.send(reply);
    }

    // add command cooldown if unused
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    // add command cooldown for user, if required
    if (!timestamps.has(message.author.id)) {
        // set time of command use by user
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }
    else {
        // calculate time when cooldown is finished
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        // check if cooldown is not finished
        if (now < expirationTime) {
            // alert user of remaining cooldown time and exit
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`Wait ${timeLeft.toFixed(1)} second(s) before using \`${command.name}\` again or I'll fucking stab you m8!`);
        }

        // reset command cooldown for user
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }

    // execute command
    try {
        command.execute(message, args);
    }
    catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
    }
});

client.on('guildCreate', async guild => {
    // validate guild is up
    if (!guild.available) { return console.error(`Server: ${guild.id} - Unavailable!`); }

    // get guild's settings, if any
    const settings = client.guildsettings.get(guild.id);
    // validate guild has no settings
    if(!settings) {
        // create new record of guild settings and add to collection
        const newSettings = await GuildSettings.create({ guild_id: guild.id });
        client.guildsettings.set(guild.id, newSettings);
        console.log(`Server: ${guild.id} - Settings added!`);

        // validate that bot has roles permission
        const hasRolePermission = guild.me.hasPermission('MANAGE_ROLES', true);
        // create tracker role
        if (hasRolePermission) {
            guild.createRole({
                name: 'Trackers',
                color: '#ff642a',
                mentionable: true,
            })
            .then(role => {
                console.log(`Server: ${guild.id} - Created new role with name ${role.name}`);
                // update tracker_id in database
                newSettings.tracker_id = role.id;
                try {
                    newSettings.save();
                }
                catch (err) {
                    console.error(err);
                }
            })
            .catch(console.error);
        }
    }
});

client.on('guildDelete', async guild => {
    if (!guild.available) { return console.error(`Server: ${guild.id} - Unavailable!`); }

    const settings = client.guildsettings.get(guild.id);
    if(settings) {
        const rowCount = await GuildSettings.destroy({ guild_id: guild.id });
        if (rowCount) {
            console.log(`Server ${guild.id} - Deleted settings in database!`);
        }
        const result = client.guildsettings.delete(guild.id);
        if (result) {
            console.log(`Server ${guild.id} - Deleted settings in collection!`);
        }
    }
});

// bot login
client.login(DISCORD_TOKEN);
