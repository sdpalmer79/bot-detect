function testUserInteraction() {
    // Simulate user interaction with the CAPTCHA
    const captchaElement = document.getElementById('captcha');
    const userInput = 'testInput'; // Example user input

    captchaElement.value = userInput; // Simulate entering input
    captchaElement.dispatchEvent(new Event('input')); // Trigger input event

    // Check if the CAPTCHA responds correctly
    if (captchaElement.value === userInput) {
        console.log('User interaction test passed.');
    } else {
        console.error('User interaction test failed.');
    }
}

function testInvalidInput() {
    const captchaElement = document.getElementById('captcha');
    const invalidInput = ''; // Example of invalid input

    captchaElement.value = invalidInput; // Simulate entering invalid input
    captchaElement.dispatchEvent(new Event('input')); // Trigger input event

    // Check if the CAPTCHA handles invalid input correctly
    if (captchaElement.value === invalidInput) {
        console.log('Invalid input test passed.');
    } else {
        console.error('Invalid input test failed.');
    }
}

function testResetFunctionality() {
    const captchaElement = document.getElementById('captcha');
    const resetButton = document.getElementById('resetButton');

    captchaElement.value = 'someInput'; // Simulate user input
    resetButton.click(); // Simulate clicking the reset button

    // Check if the CAPTCHA resets correctly
    if (captchaElement.value === '') {
        console.log('Reset functionality test passed.');
    } else {
        console.error('Reset functionality test failed.');
    }
}

// Run all tests
function runBehaviorTests() {
    testUserInteraction();
    testInvalidInput();
    testResetFunctionality();
}

// Export the runBehaviorTests function for use in other files
export { runBehaviorTests };