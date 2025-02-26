const TestType = {
    BROWSER_FINGERPRINT: 'browserFingerprint',
    NAVIGATOR_CONSISTENCY: 'navigatorConsistency',
    HEADLESS_DETECTION: 'headlessDetection',
    AUTOMATION_DETECTION: 'automationDetection',
    WEBGL_FINGERPRINTING: 'webglFingerprinting',
    CANVAS_FINGERPRINTING: 'canvasFingerprinting',
    TOUCH_CAPABILITY: 'touchCapability',
    INTERACTION_BEHAVIOR: 'interactionBehavior',
    PLUGINS_EVALUATION: 'pluginsEvaluation',
    HARDWARE_CONCURRENCY: 'hardwareConcurrency',
    JS_ERROR_HANDLING: 'jsErrorHandling',
    TIMEZONE_CONSISTENCY: 'timezoneConsistency',
    PERFORMANCE_METRICS: 'performanceMetrics'
};

// Check for inconsistencies in navigator properties
function checkNavigatorConsistency() {
    const checks = {
        userAgentData: !!navigator.userAgentData,
        webdriver: !!navigator.webdriver,
        userAgentConsistency: checkUserAgentConsistency(),
        languagesConsistency: checkLanguagesConsistency(),
        pluginsLength: navigator.plugins?.length || 0
    };
    
    return checks;
}

// Detect headless browsers
function detectHeadlessBrowser() {
    return {
        hasChromeObj: !!window.chrome,
        hasPermissions: 'permissions' in navigator,
        hasDocumentDomAutomation: !!window.document.domAutomation,
        windowOuterDimensions: checkWindowOuterDimensions(),
        connectionRtt: navigator.connection?.rtt !== undefined ? navigator.connection.rtt : null
    };
}

// Detect automation frameworks
function detectAutomationTools() {
    return {
        hasWebdriver: !!navigator.webdriver,
        hasSelenium: !!window.document.__selenium_unwrapped,
        hasDriverObject: !!window.__driver_evaluate,
        hasAwesomium: !!window.awesomium,
        hasNodeObject: checkForNodeObjects(),
        hasEmulatedDevices: checkEmulatedTouchpoints()
    };
}

// WebGL fingerprinting
function checkWebGLFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { supported: false };
        
        return {
            supported: true,
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            extensionCount: gl.getSupportedExtensions().length,
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        };
    } catch (e) {
        return { supported: false, error: e.message };
    }
}

// Canvas fingerprinting
function checkCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Draw complex shapes and text
        canvas.width = 240;
        canvas.height = 60;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(100, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.font = '11pt no-real-font-123';
        ctx.fillText('ClientCaptcha', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.font = '18pt Arial';
        ctx.fillText('Test', 4, 45);
        
        return {
            dataUrl: canvas.toDataURL().slice(0, 100),
            imageDataLength: ctx.getImageData(0, 0, canvas.width, canvas.height).data.length
        };
    } catch (e) {
        return { supported: false, error: e.message };
    }
}

async function runTest(testType, testFn) {
    const testResult = { testType, result: null, error: null };
    try {
        testResult.result = await testFn();
    } catch (e) {
        testResult.error = e.message;
    }
    return testResult;
}

const browserTests = async () => {
    const results = {
        supportsCaptcha: true,
        testResults: []
    };
    
    // Add test results
    results.testResults.push(await runTest(TestType.NAVIGATOR_CONSISTENCY, checkNavigatorConsistency));
    results.testResults.push(await runTest(TestType.HEADLESS_DETECTION, detectHeadlessBrowser));
    results.testResults.push(await runTest(TestType.AUTOMATION_DETECTION, detectAutomationTools));
    results.testResults.push(await runTest(TestType.WEBGL_FINGERPRINTING, checkWebGLFingerprint));
    results.testResults.push(await runTest(TestType.CANVAS_FINGERPRINTING, checkCanvasFingerprint));
    results.testResults.push(await runTest(TestType.TOUCH_CAPABILITY, verifyTouchCapability));
    results.testResults.push(await runTest(TestType.PLUGINS_EVALUATION, evaluatePlugins));
    results.testResults.push(await runTest(TestType.HARDWARE_CONCURRENCY, checkHardwareConcurrency));
    results.testResults.push(await runTest(TestType.TIMEZONE_CONSISTENCY, checkTimezoneConsistency));
    results.testResults.push(await runTest(TestType.PERFORMANCE_METRICS, collectPerformanceMetrics));
    
    return results;
}