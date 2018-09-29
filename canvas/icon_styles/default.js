const Canvas = require('canvas');
const snekfetch = require('snekfetch');

function textStyle(canvas, ctx, wins, custom) {
    const applyText = (text, fontSize) => {
        let size = fontSize;

        do {
            ctx.font = `${size -= 10}px "armalite rifle"`;
        } while (ctx.measureText(text).width > canvas.width - 16);
        return ctx.font;
    };

    const fontSize = (custom) ? 128 : 200;
    const font = applyText(wins, fontSize);
    ctx.font = font;
    const xPosition = canvas.width / 2;
    const yPosition = (custom) ? canvas.height - 16 : (canvas.height + ctx.measureText('M').width) / 2;

    // Create gradient
    const gradient = ctx.createLinearGradient(150.000, 300.000, 150.000, 0.000);

    if (custom) {
        console.log('Custom style!');
        
        // add colors
        gradient.addColorStop(0.150, 'rgba(231, 127, 17, 1.000)');
        gradient.addColorStop(0.400, 'rgba(254, 221, 30, 1.000)');
        gradient.addColorStop(0.600, 'rgba(254, 221, 30, 1.000)');
        gradient.addColorStop(0.800, 'rgba(254, 191, 65, 1.000)');
    }
    else {
        console.log('Default style!');
        
        // add colors
        gradient.addColorStop(0.300, 'rgba(231, 127, 17, 1.000)');
        gradient.addColorStop(0.460, 'rgba(254, 221, 30, 1.000)');
        gradient.addColorStop(0.497, 'rgba(254, 221, 30, 1.000)');
        gradient.addColorStop(0.800, 'rgba(254, 191, 65, 1.000)');
    }

    return { font, xPosition, yPosition, gradient };
}

module.exports = {
    name: 'default',
    description: 'PUBG inspired win counter.',
    hidden: false,
    example: 'https://i.imgur.com/z3V1wNj.png',
    async createIconCanvas(wins, bgUrl) {

        const canvas = Canvas.createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        let background = null;

        if (bgUrl) {
            const requestImage = await snekfetch.get(bgUrl).catch(console.error);
            background = new Canvas.Image();
            background.src = requestImage.body;
            background.onload = () => {
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            };
            background.onerror = err => { throw err; };
        }
        else {
            background = await Canvas.loadImage('./canvas/icon_styles/default_bg.jpg')
            .catch(console.error);
        }
        
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        const { font, xPosition, yPosition, gradient } = textStyle(canvas, ctx, wins, bgUrl);
       
        ctx.font = font;

        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 32;

        // stroke text
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;
        ctx.strokeText(wins, xPosition, yPosition);
        
        // fill with gradient
        ctx.fillStyle = gradient;
        ctx.fillText(wins, xPosition, yPosition);

        return canvas;
    },
};