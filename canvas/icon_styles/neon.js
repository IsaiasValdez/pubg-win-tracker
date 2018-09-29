const Canvas = require('canvas');
const snekfetch = require('snekfetch');

function textStyle(canvas, ctx, wins, custom) {
    const applyText = (text, fontSize) => {
        let size = fontSize;

        do {
            ctx.font = `${size -= 10}px "yukari"`;
        } while (ctx.measureText(text).width > canvas.width - 16);
        return ctx.font;
    };

    const fontSize = (custom) ? 128 : 200;
    const font = applyText(wins, fontSize);
    ctx.font = font;
    const xPosition = canvas.width / 2;
    const yPosition = (custom) ? canvas.height - 16 : (canvas.height + ctx.measureText('M').width) / 2;

    const gradient = ctx.createLinearGradient(0.000, 100.000, 300.000, 200.000);

    if (custom) {
        console.log('Custom style!');
        
        // Add colors
        gradient.addColorStop(0.000, 'rgba(255, 0, 0, 1.000)');
        gradient.addColorStop(0.350, 'rgba(210, 0, 255, 1.000)');
        gradient.addColorStop(1.000, 'rgba(0, 204, 255, 1.000)');
    }
    else {
        console.log('Default style!');
        
        // Add colors
        gradient.addColorStop(0.000, 'rgba(255, 0, 0, 1.000)');
        gradient.addColorStop(0.350, 'rgba(210, 0, 255, 1.000)');
        gradient.addColorStop(1.000, 'rgba(0, 204, 255, 1.000)');
    }

    return { font, xPosition, yPosition, gradient };
}

module.exports = {
    name: 'neon',
    description: 'A retro neon win counter.',
    hidden: false,
    example: 'https://i.imgur.com/NxJamV1.png',
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

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 12;
        ctx.strokeText(wins, xPosition, yPosition);

        ctx.fillStyle = 'white';
        ctx.fillText(wins, xPosition, yPosition);

        return canvas;
    },
};