const { simulateUserInteraction, checkGraphicDisplayed } = require('../../src/js/captcha');

describe('User Flow Tests', () => {
    test('should pass all automatic tests and display graphic', async () => {
        const result = await simulateUserInteraction();
        expect(result).toBe(true);
        
        const graphicDisplayed = checkGraphicDisplayed();
        expect(graphicDisplayed).toBe(true);
    });
    
    test('should not display graphic if automatic tests fail', async () => {
        const result = await simulateUserInteraction(false); // Simulate failure
        expect(result).toBe(false);
        
        const graphicDisplayed = checkGraphicDisplayed();
        expect(graphicDisplayed).toBe(false);
    });
});