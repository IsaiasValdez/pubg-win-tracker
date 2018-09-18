const Canvas = require('canvas');

module.exports = {
    name: 'tas',
    description: 'PUBG inspired win counter.',
    example: 'https://cdn.discordapp.com/attachments/367128440010309634/466782427910635521/file.jpg',
    async createIconCanvas(wins) {
        const applyText = (canvas, text) => {
           const ctx = canvas.getContext('2d');
           let fontSize = 150;

           do {
               ctx.font = `${fontSize -= 10}px "army rust"`;
           } while (ctx.measureText(text).width > canvas.width - 16);
           return ctx.font;
        };

        const canvas = Canvas.createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        const background = await Canvas.loadImage('./canvas/icon_styles/tas_bg.jpg');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
       
        ctx.font = applyText(canvas, wins);

        ctx.textAlign = 'center';

        ctx.shadowColor = 'black';
        ctx.shadowBlur = 32;

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;
        ctx.strokeText(wins, canvas.width / 2, canvas.height - 16);
        
        // Create gradient
        const grd = ctx.createLinearGradient(150.000, 300.000, 150.000, 0.000);

        // Add colors
        grd.addColorStop(0.000, 'rgba(231, 127, 17, 1.000)');
        grd.addColorStop(0.460, 'rgba(254, 221, 30, 1.000)');
        grd.addColorStop(0.497, 'rgba(254, 221, 30, 1.000)');
        grd.addColorStop(1.000, 'rgba(254, 191, 65, 1.000)');
        
        // Fill with gradient
        ctx.fillStyle = grd;
        ctx.fillText(wins, canvas.width / 2, canvas.height - 16);

        return canvas;
    },
};