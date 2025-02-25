function generateRandomImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 200;
    const height = 100;
    canvas.width = width;
    canvas.height = height;

    // Generate a random background color
    ctx.fillStyle = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
    ctx.fillRect(0, 0, width, height);

    // Generate random text
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomText = '';
    for (let i = 0; i < 6; i++) {
        randomText += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Set text properties
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(randomText, width / 2, height / 2);

    return canvas.toDataURL();
}

export default generateRandomImage;