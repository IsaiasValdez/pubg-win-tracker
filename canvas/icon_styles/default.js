const Canvas = require('canvas');

module.exports = {
    name: 'default',
    description: 'PUBG inspired win counter.',
    hidden: true,
    example: 'https://cdn.discordapp.com/attachments/367128440010309634/466782427910635521/file.jpg',
    async createIconCanvas(wins) {
        const applyText = (canvas, text) => {
           const ctx = canvas.getContext('2d');
           let fontSize = 200;

           do {
               ctx.font = `${fontSize -= 10}px "armalite rifle"`;
           } while (ctx.measureText(text).width > canvas.width - 16);
           return ctx.font;
        };

        const canvas = Canvas.createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        const background = await Canvas.loadImage('./canvas/icon_styles/default_bg.jpg')
        .catch(console.error);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
       
        ctx.font = applyText(canvas, wins);
        // calculate horizontal center position
        const x_position = canvas.width / 2;
        // calculate vertical position using M as the baseline because that works for some reason????
        const y_position = (canvas.height + ctx.measureText('M').width) / 2;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 32;

        // stroke text
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;
        ctx.strokeText(wins, x_position, y_position);
        
        // create gradient
        const grd = ctx.createLinearGradient(150.000, 300.000, 150.000, 0.000);

        // add colors
        grd.addColorStop(0.300, 'rgba(231, 127, 17, 1.000)');
        grd.addColorStop(0.460, 'rgba(254, 221, 30, 1.000)');
        grd.addColorStop(0.497, 'rgba(254, 221, 30, 1.000)');
        grd.addColorStop(0.800, 'rgba(254, 191, 65, 1.000)');
        
        // fill with gradient
        ctx.fillStyle = grd;
        ctx.fillText(wins, x_position, y_position);

        return canvas;
    },
};