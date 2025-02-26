import { timingTests } from './tests/timingTests.js';
//import { runBrowserTests } from './tests/browserTests.js';
//import { runBehaviorTests } from './tests/behaviorTests.js';
//import { generateImage } from './graphics/imageGenerator.js';
//import { renderText } from './graphics/textRenderer.js';

const captchaContainer = document.getElementById('captcha-container');
const resultContainer = document.getElementById('result-container');

function initializeCaptcha() {
    console.log('Initializing CAPTCHA...');
    
    // Add timing variation to make automated analysis harder
    setTimeout(() => runTests(), Math.random() * 50);
}

function runTests() {
    import('./tests/additionalChecks.js').then(module => {
        const timingTestsResult = timingTests();
        //const browserTestsResult = browserTests();
        //const behaviorTestsResult = behaviorTests();
        const additionalChecksResult = module.default();
        
        // Add random noise fields to further obfuscate results
        const additionalFields = {
            entropy: [...Array(5)].map(() => Math.random()),
            deviceProfile: btoa(Math.random().toString(36) + Date.now()),
            integrityMarker: Math.random().toString(36).substring(2),
            environmentFlags: {
                type: Math.random() > 0.5 ? 'standard' : 'enhanced',
                capabilities: [...Array(3)].map(() => Math.random() > 0.5)
            }
        };
        
        // Mix results with some random values to obfuscate the actual logic
        const results = {
            ...timingTestsResult,
            //...browserTestsResult,
            //...behaviorTestsResult,
            ...additionalChecksResult,
            ...additionalFields,
            checksum: Math.random().toString(36).substring(2)
        };
        
        // Randomly restructure result object to prevent pattern recognition
        if (Math.random() > 0.5) {
            results.metrics = { timing: results.timing };
            delete results.timing;
        }
        
        console.log(JSON.stringify(results));
    }); 
}
/*
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
*/

// Initialize with slight randomization
document.addEventListener('DOMContentLoaded', () => {
    // Random delay to initialization makes timing analysis harder
    setTimeout(initializeCaptcha, Math.floor(Math.random() * 20));
});