function renderDistortedText(text, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '30px "Distorted Font"';
    ctx.fillStyle = 'black';
    
    // Distort the text
    for (let i = 0; i < text.length; i++) {
        const x = 50 + i * 30;
        const y = 40 + Math.random() * 10; // Random vertical distortion
        ctx.fillText(text[i], x, y);
    }
}

export { renderDistortedText };