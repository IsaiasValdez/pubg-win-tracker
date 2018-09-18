const Canvas = require('canvas');

module.exports = {
    name: 'default',
    description: 'Do penguins dream of penguin sheep?',
    example: 'https://cdn.discordapp.com/attachments/367128440010309634/466782411041013761/file.jpg',
    async createIconCanvas(wins) {
        const applyText = (canvas, text) => {
           const ctx = canvas.getContext('2d');
           let fontSize = 200;

           do {
               ctx.font = `${fontSize -= 10}px "arial"`;
           } while (ctx.measureText(text).width > canvas.width - 16);
           return ctx.font;
        };

        const canvas = Canvas.createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        const background = await Canvas.loadImage('./canvas/icon_styles/default_bg.jpg');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
       
        ctx.font = applyText(canvas, wins);

        ctx.textAlign = 'center';

        ctx.shadowColor = 'black';
        ctx.shadowBlur = 32;

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;
        ctx.strokeText(wins, canvas.width / 2, canvas.height / 2);

        ctx.fillStyle = 'white';
        ctx.fillText(wins, canvas.width / 2, canvas.height / 2);

        return canvas;
    },
};