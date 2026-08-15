const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imgPath = 'C:\\Users\\WINDOWS-11\\.gemini\\antigravity-ide\\brain\\ce991f52-3d55-412a-a793-11eec980314e\\.user_uploaded\\media_1786771365530.jpg';
const outDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function processImage() {
    try {
        const metadata = await sharp(imgPath).metadata();
        const { width, height } = metadata;
        
        // Ensure square based on min dimension
        const size = Math.min(width, height);
        
        // Create a circular SVG mask
        const maskSvg = `
        <svg width="${size}" height="${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white" />
        </svg>
        `;
        
        const maskBuffer = Buffer.from(maskSvg);

        // First extract the central square and apply the mask
        const croppedImg = await sharp(imgPath)
            .extract({
                left: Math.round((width - size) / 2),
                top: Math.round((height - size) / 2),
                width: size,
                height: size
            })
            .composite([{ input: maskBuffer, blend: 'dest-in' }])
            .png()
            .toBuffer();

        // 192x192
        await sharp(croppedImg)
            .resize(192, 192)
            .toFile(path.join(outDir, 'rda-192x192.png'));
            
        // 512x512
        await sharp(croppedImg)
            .resize(512, 512)
            .toFile(path.join(outDir, 'rda-512x512.png'));
            
        // favicon
        await sharp(croppedImg)
            .resize(64, 64)
            .toFile(path.join(outDir, 'favicon.png'));

        // apple-touch-icon
        await sharp(croppedImg)
            .resize(180, 180)
            .toFile(path.join(outDir, 'apple-touch-icon.png'));

        // maskable (with some padding, e.g. 10% padding = image inside is 80% of size)
        // 512 * 0.8 = 410
        const maskableInner = await sharp(croppedImg)
            .resize(410, 410)
            .toBuffer();
            
        await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite([{ input: maskableInner, gravity: 'center' }])
        .png()
        .toFile(path.join(outDir, 'rda-maskable-512x512.png'));

        console.log('Images generated successfully!');
    } catch (error) {
        console.error('Error generating images:', error);
    }
}

processImage();
