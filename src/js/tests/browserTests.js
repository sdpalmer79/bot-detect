import { 
    checkUserAgentConsistency, 
    checkLanguagesConsistency, 
    checkWindowOuterDimensions, 
    checkForNodeObjects,
    checkEmulatedTouchpoints,
    performWebGLRenderingTest,
    detectWebGLBotPatterns,
    generateWebGLHash
} from '../common/utils.js';

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

/**
 * Checks for inconsistencies in browser navigator properties that indicate automated or spoofed browsers.
 * 
 * Purpose:
 * Browser automation tools and bots often have inconsistent navigator properties or expose
 * tell-tale signs of automation through their navigator object. Real browsers maintain
 * internal consistency across properties.
 * 
 * Bot characteristics detected:
 * - Webdriver-controlled browsers (Selenium, Puppeteer, Playwright)
 * - User agent spoofing (inconsistent userAgent, appVersion, platform values)
 * - Language inconsistencies (bots often have missing or incorrect language settings)
 * - Missing plugins (headless browsers typically have empty plugin lists)
 * - Browser fingerprint anomalies that don't match the claimed browser identity
 */
function checkNavigatorConsistency() {
    // Basic checks from current implementation
    const basicChecks = {
        userAgentData: !!navigator.userAgentData,
        webdriver: !!navigator.webdriver,
        userAgentConsistency: checkUserAgentConsistency(),
        languagesConsistency: checkLanguagesConsistency(),
        pluginsLength: navigator.plugins?.length || 0
    };
    
    // Check for navigator property tampering
    const propertyTampering = checkNavigatorTampering();
    
    // Hardware and capability checks
    const hardwareChecks = {
        deviceMemory: navigator.deviceMemory || 0,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        hardwareConsistency: checkHardwareConsistency()
    };
    
    // Browser-specific feature validation
    const browserFeatureChecks = validateBrowserFeatures();
    
    // Cross-property consistency analysis
    const crossPropertyConsistency = checkCrossPropertyConsistency();
    
    // Evaluate overall consistency
    const consistencyScore = evaluateNavigatorConsistency({
        ...basicChecks,
        propertyTampering,
        hardwareChecks,
        browserFeatureChecks,
        crossPropertyConsistency
    });
    
    return {
        ...basicChecks,
        propertyTampering,
        hardwareChecks,
        browserFeatureChecks,
        crossPropertyConsistency,
        isConsistent: consistencyScore < 30,
        consistencyScore
    };
}

/**
 * Detects characteristics of headless browsers commonly used in automation.
 * 
 * Purpose:
 * Headless browsers (browsers without a visual UI) are frequently used for scraping,
 * automated testing, and bot activity. These browsers have different characteristics
 * from standard browsers with visual interfaces that users interact with directly.
 * 
 * Bot characteristics detected:
 * - Missing or inconsistent Chrome browser objects (common in headless Chrome)
 * - Presence of automation-specific properties (domAutomation)
 * - Window dimension anomalies (headless browsers often have unusual window/screen ratios)
 * - Permissions API inconsistencies (often implemented differently in headless environments)
 * - Network-related deviations (connection RTT reporting in headless often differs)
 * - Detects Puppeteer, Selenium Chrome/Firefox headless, PhantomJS, and similar tools
 */
function detectHeadlessBrowser() {
    return {
        hasChromeObj: !!window.chrome,
        hasPermissions: 'permissions' in navigator,
        hasDocumentDomAutomation: !!window.document.domAutomation,
        windowOuterDimensions: checkWindowOuterDimensions(),
        connectionRtt: navigator.connection?.rtt !== undefined ? navigator.connection.rtt : null
    };
}

/**
 * Detects presence of browser automation frameworks and libraries.
 * 
 * Purpose:
 * Automation tools for web scraping and testing often leave detectable traces
 * or expose specific objects in the browser environment. This function checks
 * for these telltale signs across various automation frameworks.
 * 
 * Bot characteristics detected:
 * - Selenium WebDriver controlled browsers (Chrome, Firefox, Edge)
 * - Puppeteer automation (used for Chrome headless)
 * - Playwright framework traces
 * - PhantomJS and similar headless browsers
 * - Automation frameworks that expose webdriver flag
 * - Node.js runtime objects in browser context (indicates Electron/Node-based automation)
 * - Device emulation with inconsistent touch capabilities
 * - Awesomium and other web control frameworks
 */
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
        
        // Collect more parameters
        const parameters = {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            
            // Additional parameters that vary between real and virtual environments
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
            maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
            maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)
        };
        
        // Detailed extension analysis
        const extensions = gl.getSupportedExtensions();
        const extensionAnalysis = {
            count: extensions.length,
            hasAngle: extensions.includes('ANGLE_instanced_arrays'),
            hasDebug: extensions.includes('WEBGL_debug_renderer_info'),
            hasLoseContext: extensions.includes('WEBGL_lose_context'),
            extList: extensions.slice(0, 5) // First few for fingerprinting
        };
        
        // Perform rendering test to detect inconsistencies
        const renderingTest = performWebGLRenderingTest(gl);
        
        // Check for known bot/VM patterns
        const botPatterns = detectWebGLBotPatterns(parameters, extensions);
        
        return {
            supported: true,
            parameters,
            extensionAnalysis,
            renderingTest,
            botPatterns,
            fingerprintHash: generateWebGLHash(parameters, extensions)
        };
    } catch (e) {
        return { 
            supported: false, 
            error: e.message,
            // Being unable to run WebGL is suspicious in modern browsers
            botIndicators: { noWebGLSupport: true } 
        };
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