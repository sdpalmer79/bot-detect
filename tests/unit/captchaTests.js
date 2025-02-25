// This file contains unit tests for the functions in captcha.js, ensuring each function behaves as expected.

import { initializeCaptcha, runTests, displayGraphic } from '../../src/js/captcha';

describe('CAPTCHA Functionality Tests', () => {
    test('initializeCaptcha should set up the CAPTCHA correctly', () => {
        const captcha = initializeCaptcha();
        expect(captcha).toBeDefined();
        expect(captcha.testsPassed).toBe(false);
    });

    test('runTests should return true if all tests are passed', () => {
        const result = runTests();
        expect(result).toBe(true);
    });

    test('displayGraphic should return a graphic element', () => {
        const graphic = displayGraphic();
        expect(graphic).toBeDefined();
        expect(graphic.tagName).toBe('IMG'); // Assuming the graphic is an image
    });
});