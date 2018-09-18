const Canvas = require('canvas');

module.exports = {
    name: 'odynasty',
    description: 'A classy blood-red win counter layed on top of the carest of care packages. Only for the most *optimized* of servers.',
    example: 'https://cdn.discordapp.com/attachments/367128440010309634/466782420121681930/file.jpg',
    async createIconCanvas(wins) {
        const applyText = (canvas, text) => {
           const ctx = canvas.getContext('2d');
           let fontSize = 110;

           do {
               ctx.font = `${fontSize -= 10}px "yukari"`;
           } while (ctx.measureText(text).width > canvas.width - 16);
           return ctx.font;
        };

        const canvas = Canvas.createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        const background = await Canvas.loadImage('./canvas/icon_styles/odynasty_bg.jpg');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
       
        ctx.font = applyText(canvas, wins);

        ctx.textAlign = 'center';

        // Create gradient
        const grd = ctx.createLinearGradient(0.000, 100.000, 300.000, 200.000);
        
        // Add colors
        grd.addColorStop(0.000, 'rgba(255, 0, 0, 1.000)');
        grd.addColorStop(0.350, 'rgba(210, 0, 255, 1.000)');
        grd.addColorStop(1.000, 'rgba(0, 204, 255, 1.000)');

        ctx.strokeStyle = grd;
        ctx.lineWidth = 12;
        ctx.strokeText(wins, canvas.width / 2, canvas.height / 2 + 115);

        ctx.fillStyle = 'white';
        ctx.fillText(wins, canvas.width / 2, canvas.height / 2 + 115);

        return canvas;
    },
};