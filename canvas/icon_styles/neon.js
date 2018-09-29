const Canvas = require('canvas');

module.exports = {
    name: 'neon',
    description: 'A retro neon win counter.',
    hidden: false,
    example: 'https://i.imgur.com/NxJamV1.png',
    async createIconCanvas(wins) {
        const applyText = (canvas, text) => {
           const ctx = canvas.getContext('2d');
           let fontSize = 200;

           do {
               ctx.font = `${fontSize -= 10}px "yukari"`;
           } while (ctx.measureText(text).width > canvas.width - 16);
           return ctx.font;
        };

        const canvas = Canvas.createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        const background = await Canvas.loadImage('./canvas/icon_styles/default_bg.jpg').catch(console.error);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
       
        ctx.font = applyText(canvas, wins);
        // calculate horizontal center position
        const xPosition = canvas.width / 2;
        // calculate vertical position using M as the baseline because that works for some reason????
        const yPosition = (canvas.height + ctx.measureText('M').width) / 2;

        ctx.textAlign = 'center';

        // Create gradient
        const grd = ctx.createLinearGradient(0.000, 100.000, 300.000, 200.000);
        
        // Add colors
        grd.addColorStop(0.000, 'rgba(255, 0, 0, 1.000)');
        grd.addColorStop(0.350, 'rgba(210, 0, 255, 1.000)');
        grd.addColorStop(1.000, 'rgba(0, 204, 255, 1.000)');

        ctx.strokeStyle = grd;
        ctx.lineWidth = 12;
        ctx.strokeText(wins, xPosition, yPosition);

        ctx.fillStyle = 'white';
        ctx.fillText(wins, xPosition, yPosition);

        return canvas;
    },
};