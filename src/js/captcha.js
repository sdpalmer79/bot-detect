// This file contains the main script for the client-side CAPTCHA. It initializes the CAPTCHA, runs the series of automatic tests, and displays the graphic upon successful completion.

import { runBehaviorTests } from './tests/behaviorTests.js';
import { runTimingTests } from './tests/timingTests.js';
import { runBrowserTests } from './tests/browserTests.js';
import { generateImage } from './graphics/imageGenerator.js';
import { renderText } from './graphics/textRenderer.js';

const captchaContainer = document.getElementById('captcha-container');
const resultContainer = document.getElementById('result-container');

function initializeCaptcha() {
    console.log('Initializing CAPTCHA...');
    runTests();
}

function runTests() {
    const behaviorTestsPassed = runBehaviorTests();
    const timingTestsPassed = runTimingTests();
    const browserTestsPassed = runBrowserTests();

    if (behaviorTestsPassed && timingTestsPassed && browserTestsPassed) {
        displayGraphic();
    } else {
        console.error('CAPTCHA tests failed. Please try again.');
    }
}

function displayGraphic() {
    const isImage = Math.random() > 0.5; // Randomly choose between image and text
    if (isImage) {
        const image = generateImage();
        captchaContainer.innerHTML = `<img src="${image}" alt="CAPTCHA Image" />`;
    } else {
        const text = renderText();
        captchaContainer.innerHTML = `<div class="captcha-text">${text}</div>`;
    }
    resultContainer.innerHTML = '<p>CAPTCHA passed!</p>';
}

document.addEventListener('DOMContentLoaded', initializeCaptcha);