const Discord = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');

const iconStyles = new Discord.Collection();

const styleFiles = fs.readdirSync('./canvas/icon_styles').filter(file => file.endsWith('.js'));

// load icon styles
for (const file of styleFiles) {
    const style = require(`./icon_styles/${file}`);
    iconStyles.set(style.name, style);
}

// load custom fonts
Canvas.registerFont('./canvas/icon_styles/armalite_rifle.ttf', { family: 'armalite rifle' });
// Canvas.registerFont('./canvas/icon_styles/yukari.ttf', { family: 'yukari' });

module.exports = {
    // create icon
    async getIcon(styleName, wins) {
        const style = iconStyles.get(styleName);
        if (!style) {
            console.log(`Style: ${styleName} not found!`);
            return await iconStyles.get('default').createIconCanvas(wins); 
        }

        return await style.createIconCanvas(wins);
    },

    // request all icon styles
    getIconStyles(showHidden) {
        // display only styles that are not hidden
        return iconStyles.filter(style => !style.hidden || showHidden);
    },
};