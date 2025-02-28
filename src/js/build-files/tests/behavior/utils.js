export function checkUserAgentConsistency() {
    const ua = navigator.userAgent.toLowerCase();
    const appVersion = navigator.appVersion.toLowerCase();
    const platform = navigator.platform;
    const uaData = navigator.userAgentData;
    
    const results = {
        inconsistencies: [],
        score: 0 // Higher score means more suspicious
    };
    
    // Check 1: Compare userAgent and appVersion consistency
    if (!appVersion.includes(platform.toLowerCase()) && platform !== "Win32") {
        results.inconsistencies.push('platform_mismatch');
        results.score += 10;
    }
    
    // Check 2: Browser name consistency
    const browserChecks = {
        chrome: ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr'),
        firefox: ua.includes('firefox'),
        safari: ua.includes('safari') && !ua.includes('chrome') && !ua.includes('edg'),
        edge: ua.includes('edg'),
        opera: ua.includes('opr') || ua.includes('opera')
    };
    
    if (browserChecks.chrome && !window.chrome) {
        results.inconsistencies.push('chrome_object_missing');
        results.score += 20;
    }
    
    if (browserChecks.firefox && !('InstallTrigger' in window)) {
        results.inconsistencies.push('firefox_object_missing');
        results.score += 20;
    }
    
    // Check 3: OS consistency
    const osChecks = {
        windows: ua.includes('windows') || ua.includes('win64') || ua.includes('win32'),
        mac: ua.includes('macintosh') || ua.includes('mac os'),
        linux: ua.includes('linux'),
        android: ua.includes('android'),
        ios: ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')
    };
    
    const platformOS = {
        windows: platform.includes('Win'),
        mac: platform.includes('Mac'),
        linux: platform.includes('Linux'),
        android: platform.includes('Android'),
        ios: platform.includes('iPhone') || platform.includes('iPad') || platform.includes('iPod')
    };
    
    // Compare OS detection methods
    for (const os in osChecks) {
        if (osChecks[os] !== platformOS[os]) {
            results.inconsistencies.push(`os_mismatch_${os}`);
            results.score += 15;
        }
    }
    
    // Check 4: Compare with userAgentData (if available)
    if (uaData && uaData.brands) {
        const uaDataBrands = uaData.brands.map(b => b.brand.toLowerCase());
        
        if (browserChecks.chrome && !uaDataBrands.some(b => b.includes('chrome'))) {
            results.inconsistencies.push('uadata_chrome_mismatch');
            results.score += 15;
        }
        
        if (browserChecks.edge && !uaDataBrands.some(b => b.includes('edge'))) {
            results.inconsistencies.push('uadata_edge_mismatch');
            results.score += 15;
        }
        
        if (uaData.mobile !== ua.includes('mobile')) {
            results.inconsistencies.push('mobile_status_mismatch');
            results.score += 10;
        }
    }
    
    // Check 5: Look for known bot patterns
    const botPatterns = [
        'headless', 'bot', 'crawl', 'spider', 'slurp', 'search', 
        'lighthouse', 'pagespeed', 'phantomjs', 'selenium', 
        'webdriver', 'puppeteer', 'cypress'
    ];
    
    for (const pattern of botPatterns) {
        if (ua.includes(pattern)) {
            results.inconsistencies.push(`bot_pattern_${pattern}`);
            results.score += 25;
        }
    }
    
    // Check 6: Test for browser-specific features
    if (browserChecks.chrome && typeof window.Notification === 'undefined') {
        results.inconsistencies.push('missing_chrome_feature');
        results.score += 15;
    }
    
    if (browserChecks.safari && typeof window.WebGLRenderingContext === 'undefined') {
        results.inconsistencies.push('missing_safari_feature');
        results.score += 15;
    }
    
    return {
        userAgent: ua,
        appVersion: appVersion,
        platform: platform,
        hasUserAgentData: !!uaData,
        inconsistencies: results.inconsistencies,
        suspicionScore: results.score,
        isLikelyModified: results.score > 25
    };
}

export function checkLanguagesConsistency() {
    const results = {
        inconsistencies: [],
        score: 0
    };
    
    // Get language information from different navigator properties
    const language = navigator.language || '';
    const languages = navigator.languages || [];
    const browserLanguage = navigator.browserLanguage || '';
    const userLanguage = navigator.userLanguage || '';
    const systemLanguage = navigator.systemLanguage || '';
    
    // Check if navigator.languages exists (missing in older browsers and some bots)
    if (!navigator.languages || languages.length === 0) {
        results.inconsistencies.push('languages_array_missing');
        results.score += 15;
    } else {
        // Check if navigator.language matches first entry in navigator.languages
        if (language && languages.length > 0 && language !== languages[0]) {
            results.inconsistencies.push('language_mismatch');
            results.score += 15;
        }
        
        // Check for unusual number of languages (bots often have either 0 or a large number)
        if (languages.length > 10) {
            results.inconsistencies.push('excessive_languages');
            results.score += 10;
        }
    }
    
    // Check if language codes follow the correct format (e.g., en-US, fr-FR)
    const validLanguagePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
    if (language && !validLanguagePattern.test(language)) {
        results.inconsistencies.push('invalid_language_format');
        results.score += 15;
    }
    
    // Check for consistency across legacy language properties in IE
    if (browserLanguage || userLanguage || systemLanguage) {
        const legacyLanguages = [browserLanguage, userLanguage, systemLanguage].filter(Boolean);
        const uniqueLegacyLanguages = [...new Set(legacyLanguages)];
        
        if (uniqueLegacyLanguages.length > 1) {
            results.inconsistencies.push('inconsistent_legacy_languages');
            results.score += 10;
        }
        
        // Compare with standard language property
        if (language && legacyLanguages.length > 0 && !legacyLanguages.includes(language)) {
            results.inconsistencies.push('language_legacy_mismatch');
            results.score += 15;
        }
    }
    
    // Check timezone and language consistency
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const languageCode = language.split('-')[0];
        
        // Common mismatches that might indicate spoofing
        const suspiciousCombinations = [
            { lang: 'en', timezone: 'Asia/Shanghai' },
            { lang: 'en', timezone: 'Asia/Beijing' },
            { lang: 'zh', timezone: 'America/New_York' },
            { lang: 'ru', timezone: 'America/Los_Angeles' },
            { lang: 'ar', timezone: 'Europe/London' }
        ];
        
        for (const combo of suspiciousCombinations) {
            if (languageCode === combo.lang && timezone === combo.timezone) {
                results.inconsistencies.push('suspicious_language_timezone');
                results.score += 20;
                break;
            }
        }
    } catch (e) {
        // Intl API might not be supported
        results.inconsistencies.push('timezone_check_failed');
    }
    
    return {
        language,
        languages: Array.from(languages),
        hasLanguagesArray: languages.length > 0,
        inconsistencies: results.inconsistencies,
        suspicionScore: results.score,
        isLikelySpoofed: results.score > 20
    };
}

export function checkWindowOuterDimensions() {
    // Get window dimensions
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const outerWidth = window.outerWidth;
    const outerHeight = window.outerHeight;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const screenAvailWidth = window.screen.availWidth;
    const screenAvailHeight = window.screen.availHeight;
    
    // Calculate dimension ratios and differences
    const innerOuterWidthDiff = outerWidth - winWidth;
    const innerOuterHeightDiff = outerHeight - winHeight;
    const outerScreenRatio = (outerWidth / screenWidth).toFixed(2);
    
    // Common headless browser signatures
    const commonAutomationSizes = [
        { width: 800, height: 600 },     // Common Selenium default
        { width: 1366, height: 768 },    // Common Puppeteer default
        { width: 1920, height: 1080 }    // Common Playwright default
    ];
    
    const suspiciousIndicators = {
        // Zero or negative dimension values are often signs of headless environment or spoofing
        hasZeroDimensions: outerWidth <= 0 || outerHeight <= 0,
        
        // Very small window sizes are suspicious (could be minimized browser in automation)
        hasTinyWindow: outerWidth < 100 || outerHeight < 100,
        
        // In real browsers the outer dimensions are always larger than inner dimensions
        // due to browser UI elements (address bar, toolbar, etc)
        inconsistentDimensions: innerOuterWidthDiff <= 0 || innerOuterHeightDiff <= 0,
        
        // In real browsers, the outer dimensions are smaller than screen dimensions
        impossibleDimensions: outerWidth > screenWidth || outerHeight > screenHeight,
        
        // Exact matches to common automation defaults is suspicious
        matchesAutomationDefaults: commonAutomationSizes.some(
            size => (size.width === outerWidth && size.height === outerHeight)
        ),
        
        // Screen size equals window size (common in headless environments)
        screenMatchesWindow: outerWidth === screenWidth && outerHeight === screenHeight,
        
        // Available screen exactly matches screen dimensions (unlikely in real user environments)
        availableMatchesScreen: screenWidth === screenAvailWidth && screenHeight === screenAvailHeight
    };
    
    return {
        dimensions: {
            inner: { width: winWidth, height: winHeight },
            outer: { width: outerWidth, height: outerHeight },
            screen: { width: screenWidth, height: screenHeight },
            availScreen: { width: screenAvailWidth, height: screenAvailHeight }
        },
        metrics: {
            innerOuterWidthDiff,
            innerOuterHeightDiff,
            outerScreenRatio
        },
        indicators: suspiciousIndicators,
        isHeadlessLikely: Object.values(suspiciousIndicators).filter(Boolean).length >= 2
    };
}

export function checkForNodeObjects() {
    const detectionResults = {
        // Node.js specific globals
        hasProcess: typeof process !== 'undefined',
        hasBuffer: typeof Buffer !== 'undefined',
        hasRequire: typeof require !== 'undefined',
        hasNodeGlobals: typeof global !== 'undefined' && global === window,
        
        // Puppeteer/Playwright specific objects that might leak into the page context
        hasPuppeteerObjects: false,
        hasPlaywrightObjects: false,
        
        // Check for Node-specific properties on window object
        hasNodeProperties: false
    };
    
    // Check for Puppeteer/Playwright specific objects and properties
    try {
        // Puppeteer sometimes exposes these objects
        detectionResults.hasPuppeteerObjects = !!(
            window.chrome && 
            window.chrome.loadTimes && 
            window._puppeteer
        );
        
        // Playwright might expose these
        detectionResults.hasPlaywrightObjects = !!(
            window.playwright || 
            window._playwright
        );
        
        // Check for revealing property descriptors on navigator
        const propDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
        if (propDescriptor && (propDescriptor.get || {}).toString().includes('native code')) {
            detectionResults.hasNormalWebdriverImpl = true;
        } else if (propDescriptor) {
            detectionResults.hasModifiedWebdriverImpl = true;
        }
        
        // Check for Node.js properties on window object
        const suspiciousProps = ['process', 'require', 'module', 'exports', '__dirname', '__filename'];
        detectionResults.hasNodeProperties = suspiciousProps.some(prop => prop in window);
        
    } catch (e) {
        // Error accessing properties is suspicious in itself
        detectionResults.accessError = true;
    }
    
    // Calculate if any Node objects were detected
    detectionResults.nodeObjectsDetected = 
        detectionResults.hasProcess || 
        detectionResults.hasBuffer || 
        detectionResults.hasRequire || 
        detectionResults.hasNodeGlobals || 
        detectionResults.hasPuppeteerObjects || 
        detectionResults.hasPlaywrightObjects || 
        detectionResults.hasNodeProperties;
    
    return detectionResults;
}

export function checkEmulatedTouchpoints() {
    const results = {
        touchPoints: navigator.maxTouchPoints || 0,
        hasTouchScreen: false,
        hasCoarsePointer: false,
        inconsistentTouch: false,
        touchEventsSupported: false,
        pointerEventsSupported: false
    };
    
    // Check for touch screen via media query
    results.hasTouchScreen = window.matchMedia('(any-pointer: coarse)').matches || 
                            window.matchMedia('(any-hover: none)').matches;
    
    // Check for coarse pointer which indicates touch interface
    results.hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    
    // Check for touch event support
    results.touchEventsSupported = 'ontouchstart' in window;
    
    // Check for pointer events support
    results.pointerEventsSupported = window.PointerEvent !== undefined;
    
    // Detect mobile device via user agent as additional reference point
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    
    // Check for inconsistencies that might indicate emulation
    const inconsistencies = [];
    
    // Suspicious case 1: Claims touch support but not in a mobile user agent
    if (results.touchPoints > 0 && !isMobileUA) {
        inconsistencies.push('touch_without_mobile_ua');
    }
    
    // Suspicious case 2: Has touch events but no max touch points
    if (results.touchEventsSupported && results.touchPoints === 0) {
        inconsistencies.push('touch_events_without_touchpoints');
    }
    
    // Suspicious case 3: Reports as mobile but no touch capabilities
    if (isMobileUA && results.touchPoints === 0 && !results.touchEventsSupported) {
        inconsistencies.push('mobile_without_touch');
    }
    
    // Suspicious case 4: Unusual number of touch points (most devices have 5-10)
    if (results.touchPoints > 0 && (results.touchPoints > 20 || results.touchPoints === 1)) {
        inconsistencies.push('unusual_touchpoint_count');
    }
    
    // Suspicious case 5: Mismatch between touch screen media query and touch events
    if (results.hasTouchScreen !== results.touchEventsSupported) {
        inconsistencies.push('mediaquery_event_mismatch');
    }
    
    // Try to detect common automated browsers that emulate touch
    const automationHints = [];
    
    if (navigator.webdriver) {
        automationHints.push('webdriver_enabled');
    }
    
    if (ua.includes('headless')) {
        automationHints.push('headless_in_ua');
    }
    
    // Set result
    results.inconsistencies = inconsistencies;
    results.automationHints = automationHints;
    results.isLikelyEmulated = inconsistencies.length > 0 || automationHints.length > 0;
    
    return results;
}

export function performWebGLRenderingTest(gl) {
    // Prepare canvas for testing
    const canvas = gl.canvas;
    canvas.width = 256;
    canvas.height = 256;
    
    // Store start time to measure performance
    const startTime = performance.now();
    
    // 1. Create shader programs to test shader compilation and execution
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, `
        precision highp float;
        attribute vec2 position;
        varying vec2 texCoord;
        void main() {
            texCoord = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vertexShader);
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    // Use more complex shader with math operations that might vary in precision
    gl.shaderSource(fragmentShader, `
        precision highp float;
        varying vec2 texCoord;
        uniform float time;
        
        // Complex math to test precision differences
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
            vec2 uv = texCoord * 2.0 - 1.0;
            float r = length(uv) * 8.0;
            float a = atan(uv.y, uv.x);
            float v = sin(r * 0.31 + time) + sin(a * 3.0 + time * 0.5) + sin((r + a) * 0.2 + time * 0.7);
            vec3 color = hsv2rgb(vec3(v * 0.1 + 0.7, 0.5, 0.8));
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    gl.compileShader(fragmentShader);
    
    // Check shader compilation status (useful for detecting differences)
    const vertexCompiled = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
    const fragmentCompiled = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
    const vertexError = !vertexCompiled ? gl.getShaderInfoLog(vertexShader) : null;
    const fragmentError = !fragmentCompiled ? gl.getShaderInfoLog(fragmentShader) : null;
    
    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    // Check program linking status
    const programLinked = gl.getProgramParameter(program, gl.LINK_STATUS);
    
    // Skip rendering if compilation or linking failed
    if (!vertexCompiled || !fragmentCompiled || !programLinked) {
        return {
            success: false,
            compilationErrors: {
                vertex: vertexError,
                fragment: fragmentError
            },
            linkingError: !programLinked
        };
    }
    
    // 2. Create geometry for a simple full-screen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ]), gl.STATIC_DRAW);
    
    // 3. Set up rendering
    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    const timeLocation = gl.getUniformLocation(program, "time");
    gl.uniform1f(timeLocation, 1.5); // Fixed time value for consistent output
    
    // 4. Perform the actual rendering
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // 5. Read back the rendered pixels for analysis
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // 6. Analyze the rendered output
    const endTime = performance.now();
    
    // Calculate simple hash of the image data (first 10000 bytes is enough)
    let renderHash = 0;
    const sampleSize = Math.min(10000, pixels.length);
    for (let i = 0; i < sampleSize; i++) {
        renderHash = ((renderHash << 5) - renderHash) + pixels[i];
        renderHash |= 0; // Convert to 32bit integer
    }
    
    // Color variance analysis (to detect simplistic renderers)
    let colorVariance = 0;
    let prevColor = pixels[0];
    for (let i = 4; i < pixels.length; i += 4) {
        colorVariance += Math.abs(pixels[i] - prevColor);
        prevColor = pixels[i];
    }
    colorVariance /= (pixels.length / 4);
    
    // Check for uniform areas (could indicate simplified rendering)
    let uniformRegions = 0;
    let sampleRegions = 10;
    const regionSize = (canvas.width * canvas.height) / sampleRegions;
    
    for (let region = 0; region < sampleRegions; region++) {
        const startIdx = Math.floor(region * regionSize) * 4;
        const endIdx = Math.min(startIdx + regionSize * 4, pixels.length);
        let allSame = true;
        
        for (let i = startIdx + 4; i < endIdx; i += 4) {
            if (pixels[i] !== pixels[startIdx] || 
                pixels[i+1] !== pixels[startIdx+1] || 
                pixels[i+2] !== pixels[startIdx+2]) {
                allSame = false;
                break;
            }
        }
        
        if (allSame) uniformRegions++;
    }
    
    // 7. Clean up
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    gl.deleteBuffer(positionBuffer);
    
    // 8. Return the analysis results
    return {
        success: true,
        renderTime: endTime - startTime,
        imageHash: renderHash.toString(16),
        colorVariance: colorVariance,
        uniformRegions: uniformRegions,
        // These aspects often differ between real and automated browsers
        indicators: {
            lowVariance: colorVariance < 5,
            tooManyUniformRegions: uniformRegions > 5,
            suspiciouslyFast: (endTime - startTime) < 2,
            suspiciouslyConsistent: renderHash === 0,
            // This is a critical indicator - browsers render differently
            likelyBot: colorVariance < 5 || uniformRegions > 5 || renderHash === 0
        }
    };
}

export function detectWebGLBotPatterns(parameters, extensions) {
    // Initialize results object
    const results = {
        suspiciousRenderer: false,
        softwareRenderer: false,
        virtualizedEnvironment: false,
        inconsistentCapabilities: false,
        limitedExtensions: false,
        automationIndicators: [],
        botScore: 0
    };
    
    // Convert parameters to lowercase for case-insensitive comparison
    const vendor = (parameters.vendor || '').toLowerCase();
    const renderer = (parameters.renderer || '').toLowerCase();
    const version = (parameters.version || '').toLowerCase();
    
    // 1. Check for software renderers - strong indicators of headless/bot environments
    const softwareRenderers = [
        'swiftshader', 'llvmpipe', 'software', 'virgl', 'virtualbox',
        'mesa offscreen', 'microsoft basic render'
    ];
    
    for (const sr of softwareRenderers) {
        if (renderer.includes(sr)) {
            results.softwareRenderer = true;
            results.automationIndicators.push(`software_renderer_${sr}`);
            results.botScore += 25;
            break;
        }
    }
    
    // 2. Check for virtualized environments
    const virtualEnvironments = [
        'vmware', 'virtual', 'vm ', 'qemu', 'xen', 'parallels',
        'virtualbox', 'proxmox', 'microsoft remote display'
    ];
    
    for (const ve of virtualEnvironments) {
        if (renderer.includes(ve) || vendor.includes(ve)) {
            results.virtualizedEnvironment = true;
            results.automationIndicators.push(`virtual_env_${ve}`);
            results.botScore += 15; // Lower score as VMs can be legitimate
            break;
        }
    }
    
    // 3. Check for suspicious generic renderers that might indicate spoofing
    const suspiciousRenderers = [
        'generic', 'standard', 'unknown', 'undefined', 'default', 
        'compatibility profile', 'chromium', 'mozilla'
    ];
    
    for (const sr of suspiciousRenderers) {
        if (renderer.includes(sr)) {
            results.suspiciousRenderer = true;
            results.automationIndicators.push(`generic_renderer_${sr}`);
            results.botScore += 10;
            break;
        }
    }
    
    // 4. Check for inconsistent or limited capabilities
    // Real GPUs typically have certain minimum capabilities
    if (parameters.maxTextureSize < 2048 || 
        (parameters.maxViewportDims && parameters.maxViewportDims[0] < 1024)) {
        results.inconsistentCapabilities = true;
        results.automationIndicators.push('limited_texture_viewport');
        results.botScore += 15;
    }
    
    if (parameters.maxVertexTextureImageUnits < 4) {
        results.inconsistentCapabilities = true;
        results.automationIndicators.push('limited_vertex_textures');
        results.botScore += 10;
    }
    
    // 5. Check for missing or unusual extensions
    // Most modern browsers support a large number of WebGL extensions
    if (extensions.length < 15) {
        results.limitedExtensions = true;
        results.automationIndicators.push('few_extensions');
        results.botScore += 15;
    }
    
    // Important extensions that should be available in most real browsers
    const criticalExtensions = [
        'OES_texture_float',
        'WEBGL_debug_renderer_info',
        'WEBGL_lose_context',
        'OES_standard_derivatives'
    ];
    
    let missingCriticalExtCount = 0;
    for (const ext of criticalExtensions) {
        if (!extensions.includes(ext)) {
            missingCriticalExtCount++;
        }
    }
    
    if (missingCriticalExtCount >= 2) {
        results.limitedExtensions = true;
        results.automationIndicators.push('missing_critical_extensions');
        results.botScore += 15;
    }
    
    // 6. Check vendor/renderer for mismatch with version
    // For example, if claiming to be Intel but version string doesn't match
    if (vendor.includes('intel') && !version.includes('intel')) {
        results.suspiciousRenderer = true;
        results.automationIndicators.push('vendor_version_mismatch');
        results.botScore += 20;
    }
    
    // 7. Check for unusual combinations that might indicate spoofing
    // Apple GPUs should only appear on Apple OS
    if ((renderer.includes('apple') || vendor.includes('apple')) && 
        navigator.userAgent.toLowerCase().includes('windows')) {
        results.suspiciousRenderer = true;
        results.automationIndicators.push('apple_gpu_on_windows');
        results.botScore += 25;
    }
    
    // Mobile GPUs shouldn't appear on desktop OS
    const mobileGPUs = ['adreno', 'mali', 'powervr', 'apple gpu'];
    const isDesktopOS = !navigator.userAgent.toLowerCase().match(/(android|iphone|ipad|ipod)/i);
    
    for (const gpu of mobileGPUs) {
        if ((renderer.includes(gpu) || vendor.includes(gpu)) && isDesktopOS) {
            results.suspiciousRenderer = true;
            results.automationIndicators.push(`mobile_gpu_on_desktop`);
            results.botScore += 25;
            break;
        }
    }
    
    // Summary results
    results.isSuspicious = results.botScore > 30;
    results.isHighlyLikelyBot = results.botScore > 50;
    
    return results;
}

export function generateWebGLHash(parameters, extensions) {
    // Select most distinctive parameters for fingerprinting
    const keyParameters = [
        parameters.vendor || '',
        parameters.renderer || '',
        parameters.version || '',
        parameters.shadingLanguageVersion || '',
        parameters.maxTextureSize || 0,
        Array.isArray(parameters.maxViewportDims) ? parameters.maxViewportDims.join(',') : '0,0',
        parameters.maxVertexAttribs || 0,
        parameters.maxVertexTextureImageUnits || 0
    ];
    
    // Sort extensions to ensure consistent order
    const sortedExtensions = [...(extensions || [])].sort();
    
    // Select a subset of extensions to include in fingerprint
    // Using every 3rd extension to reduce fingerprint size while maintaining uniqueness
    const extensionSubset = sortedExtensions.filter((_, i) => i % 3 === 0);
    
    // Combine all values into a single string
    const fingerprintSource = [
        ...keyParameters,
        extensionSubset.length.toString(),
        ...extensionSubset
    ].join('|');
    
    // Generate hash from string
    // Using simple but effective hash function (djb2)
    let hash = 5381;
    for (let i = 0; i < fingerprintSource.length; i++) {
        hash = ((hash << 5) + hash) + fingerprintSource.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to base36 string (alphanumeric) for more compact representation
    const hashString = Math.abs(hash).toString(36);
    
    // Add prefix to indicate this is a WebGL hash
    return `wgl-${hashString}`;
}

export function checkNavigatorTampering() {
    const results = {
        modifiedProperties: [],
        suspiciousDescriptors: [],
        prototypeModifications: false,
        toStringOverrides: false,
        score: 0
    };
    
    // Key properties that are commonly tampered with
    const keyProperties = [
        'userAgent', 'appVersion', 'platform', 'vendor',
        'language', 'languages', 'plugins', 'mimeTypes',
        'webdriver', 'hardwareConcurrency', 'deviceMemory'
    ];
    
    // Check for modifications to Navigator.prototype
    try {
        // Store original toString method
        const originalToString = Object.getOwnPropertyDescriptor(
            Navigator.prototype, 'toString'
        )?.value?.toString();
        
        // Check if properties have been tampered with
        for (const prop of keyProperties) {
            // Skip if property doesn't exist
            if (!(prop in navigator)) continue;
            
            // Get property descriptor from prototype
            const propDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
            
            // Some properties might not be directly on Navigator.prototype (could be on Object.prototype)
            if (!propDescriptor) continue;
            
            // Check if getter has been overridden
            if (propDescriptor.get) {
                const getterStr = propDescriptor.get.toString();
                
                // Native getters typically contain "[native code]"
                if (!getterStr.includes("[native code]")) {
                    results.suspiciousDescriptors.push(prop);
                    results.score += 15;
                }
                
                // Look for suspicious patterns in getter implementation
                if (getterStr.includes('if') || getterStr.includes('return') && getterStr.length > 50) {
                    results.suspiciousDescriptors.push(`${prop}_complex`);
                    results.score += 10;
                }
            }
            
            // Check for non-configurable properties that should be configurable
            // Many anti-fingerprinting tools make properties non-configurable
            if (propDescriptor.configurable === false && prop !== 'userAgent') {
                results.suspiciousDescriptors.push(`${prop}_nonconfigurable`);
                results.score += 5;
            }
        }
        
        // Check for Navigator.prototype modifications
        const prototypeKeys = Object.getOwnPropertyNames(Navigator.prototype);
        const unusualProperties = prototypeKeys.filter(key => 
            !['constructor', 'toString', 'toJSON'].includes(key) && 
            !keyProperties.includes(key));
            
        if (unusualProperties.length > 0) {
            results.prototypeModifications = true;
            results.score += 15;
        }
        
        // Check if toString has been tampered with
        const currentToString = Object.getOwnPropertyDescriptor(
            Navigator.prototype, 'toString'
        )?.value?.toString();
        
        if (currentToString && originalToString && 
            currentToString !== originalToString) {
            results.toStringOverrides = true;
            results.score += 20;
        }
        
        // Direct property checks on navigator instance
        for (const prop of keyProperties) {
            try {
                // Some properties shouldn't be undefined in normal browsers
                if (['userAgent', 'appVersion', 'platform'].includes(prop) && 
                    navigator[prop] === undefined) {
                    results.modifiedProperties.push(`${prop}_undefined`);
                    results.score += 15;
                }
                
                // Check plugins array for suspicious patterns
                if (prop === 'plugins' && navigator.plugins) {
                    const plugins = navigator.plugins;
                    
                    // Check if plugins array-like object has been tampered with
                    if (plugins.length > 0 && plugins[0] === undefined) {
                        results.modifiedProperties.push('plugins_inconsistent');
                        results.score += 10;
                    }
                    
                    // In real browsers, plugins is an array-like object, not a true Array
                    if (Object.prototype.toString.call(plugins) === '[object Array]') {
                        results.modifiedProperties.push('plugins_array');
                        results.score += 20;
                    }
                }
            } catch (err) {
                // If accessing a property throws an error, that's highly suspicious
                results.modifiedProperties.push(`${prop}_access_error`);
                results.score += 25;
            }
        }
        
        // Test for frozen properties
        let isFrozen = false;
        try {
            // Try to temporarily modify a non-essential navigator property
            const originalProp = navigator.doNotTrack;
            // @ts-ignore - intentional attempt to modify
            navigator.doNotTrack = "test_modification";
            // @ts-ignore
            isFrozen = navigator.doNotTrack === originalProp;
            // @ts-ignore - restore original
            navigator.doNotTrack = originalProp;
        } catch (e) {
            // If modification throws, navigator might be frozen or sealed
            isFrozen = true;
        }
        
        if (isFrozen) {
            results.modifiedProperties.push('frozen_navigator');
            results.score += 15;
        }
        
    } catch (e) {
        // Errors during property checks are suspicious
        results.error = e.message;
        results.score += 20;
    }
    
    // Final analysis
    results.isTampered = results.score >= 25;
    results.highConfidenceTampering = results.score >= 50;
    
    return results;
}

function measureComputationalPerformance() {
    const startTime = performance.now();
    let result = 0;
    
    // Simple computational benchmark
    for (let i = 0; i < 500000; i++) {
        result += Math.sqrt(i * 12.37) * Math.cos(i * 0.0001);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
        duration,
        score: 1000 / duration * 100, // Higher score = better performance
        result // Prevents JS engine from optimizing away the calculation
    };
}

function getBrowserEngine(userAgent) {
    if (/chrome/i.test(userAgent)) return 'chrome';
    if (/firefox/i.test(userAgent)) return 'firefox';
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'safari';
    if (/edge/i.test(userAgent)) return 'edge';
    if (/trident|msie/i.test(userAgent)) return 'ie';
    return 'unknown';
}

function getExpectedMinCores(engine) {
    switch (engine) {
        case 'chrome': return 2;
        case 'firefox': return 2;
        case 'safari': return 2;
        case 'edge': return 2;
        default: return 1;
    }
}

export function checkHardwareConsistency() {
    // Results object to store findings
    const results = {
        inconsistencies: [],
        score: 0
    };
    
    // Get hardware-related properties
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;
    const deviceMemory = navigator.deviceMemory || 0;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const platform = navigator.platform || '';
    const userAgent = navigator.userAgent || '';
    
    // Check for impossible or highly suspicious values
    if (hardwareConcurrency > 128) {
        results.inconsistencies.push('excessive_cpu_cores');
        results.score += 20;
    }
    
    if (deviceMemory > 32) {
        results.inconsistencies.push('excessive_memory');
        results.score += 20;
    }
    
    // Check for common bot/VM values
    const suspiciousCoreValues = [1, 2, 4];
    if (suspiciousCoreValues.includes(hardwareConcurrency) && 
        deviceMemory === hardwareConcurrency) {
        results.inconsistencies.push('matching_memory_cores');
        results.score += 15;
    }
    
    // Perform simple performance benchmark
    const performanceMeasurement = measureComputationalPerformance();
    
    // Check for mismatch between reported cores and actual performance
    if (hardwareConcurrency >= 8 && performanceMeasurement.score < 40) {
        results.inconsistencies.push('high_cores_low_performance');
        results.score += 25;
    }
    
    if (hardwareConcurrency <= 2 && performanceMeasurement.score > 150) {
        results.inconsistencies.push('low_cores_high_performance');
        results.score += 20;
    }
    
    // Check for platform/hardware consistency
    const isMobileUA = /android|mobile|iphone|ipad|ipod/i.test(userAgent);
    const isMobilePlatform = /android|iphone|ipad|ipod/i.test(platform);
    
    // Mobile devices should have touch capabilities
    if (isMobileUA && maxTouchPoints === 0) {
        results.inconsistencies.push('mobile_without_touch');
        results.score += 25;
    }
    
    // Mobile platform and UA should match
    if (isMobileUA !== isMobilePlatform) {
        results.inconsistencies.push('platform_ua_mismatch');
        results.score += 15;
    }
    
    // Memory/CPU pattern checks
    const browserEngine = getBrowserEngine(userAgent);
    const expectedMinCores = getExpectedMinCores(browserEngine);
    
    if (hardwareConcurrency < expectedMinCores && browserEngine !== 'unknown') {
        results.inconsistencies.push('unusually_low_cores');
        results.score += 10;
    }
    
    // Special headless browser pattern check
    if (hardwareConcurrency === 4 && deviceMemory === 4 && 
        !window.chrome && navigator.plugins.length === 0) {
        results.inconsistencies.push('headless_pattern');
        results.score += 30;
    }
    
    return {
        hardwareConcurrency,
        deviceMemory,
        maxTouchPoints,
        performanceScore: performanceMeasurement.score,
        platformConsistent: isMobileUA === isMobilePlatform,
        inconsistencies: results.inconsistencies,
        suspicionScore: results.score,
        isConsistent: results.score < 25
    };
}

export function validateBrowserFeatures() {
    // Extract browser type from user agent
    const ua = navigator.userAgent.toLowerCase();
    const isChrome = ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr');
    const isFirefox = ua.includes('firefox');
    const isSafari = ua.includes('safari') && !ua.includes('chrome');
    const isEdge = ua.includes('edg');
    const isOpera = ua.includes('opr') || ua.includes('opera');
    const isIE = ua.includes('trident') || ua.includes('msie');
    
    // Store detected browser type
    const detectedBrowser = isChrome ? 'chrome' : 
                           isFirefox ? 'firefox' : 
                           isSafari ? 'safari' : 
                           isEdge ? 'edge' : 
                           isOpera ? 'opera' : 
                           isIE ? 'ie' : 'unknown';
    
    // Results object
    const results = {
        detectedBrowser,
        missingFeatures: [],
        unexpectedFeatures: [],
        browserSpecificTests: {},
        consistencyScore: 100 // Start at 100 and deduct for inconsistencies
    };
    
    // 1. Chrome-specific features
    if (isChrome) {
        // Features that should exist in Chrome
        if (!window.chrome) {
            results.missingFeatures.push('chrome_object');
            results.consistencyScore -= 25;
        }
        
        if (!window.Notification) {
            results.missingFeatures.push('notifications');
            results.consistencyScore -= 15;
        }
        
        if (!CSS.supports || typeof CSS.supports !== 'function') {
            results.missingFeatures.push('css_supports');
            results.consistencyScore -= 10;
        }
        
        // Check Chrome-specific chrome object properties
        if (window.chrome) {
            const chromeProps = ['app', 'runtime', 'webstore'];
            let missingChromeProps = 0;
            
            for (const prop of chromeProps) {
                if (!window.chrome[prop]) {
                    missingChromeProps++;
                }
            }
            
            if (missingChromeProps >= 2) {
                results.missingFeatures.push('chrome_specific_apis');
                results.consistencyScore -= 20;
            }
        }
        
        // Firefox-specific features shouldn't exist
        if (typeof InstallTrigger !== 'undefined') {
            results.unexpectedFeatures.push('firefox_install_trigger');
            results.consistencyScore -= 25;
        }
        
        // Safari-specific features shouldn't exist in Chrome
        if (typeof window.ApplePaySession !== 'undefined') {
            results.unexpectedFeatures.push('safari_apple_pay');
            results.consistencyScore -= 25;
        }
    }
    
    // 2. Firefox-specific features
    if (isFirefox) {
        // Features that should exist in Firefox
        if (typeof InstallTrigger === 'undefined') {
            results.missingFeatures.push('install_trigger');
            results.consistencyScore -= 25;
        }
        
        // Firefox uses different WebRTC object naming
        if (!window.mozRTCPeerConnection && !window.RTCPeerConnection) {
            results.missingFeatures.push('rtc_connection');
            results.consistencyScore -= 15;
        }
        
        // Chrome-specific features shouldn't exist
        if (window.chrome && window.chrome.webstore) {
            results.unexpectedFeatures.push('chrome_webstore');
            results.consistencyScore -= 25;
        }
        
        // CSS feature detection
        try {
            // Firefox supports this selector
            if (CSS && CSS.supports && !CSS.supports('(scrollbar-width: none)')) {
                results.missingFeatures.push('scrollbar_width_support');
                results.consistencyScore -= 10;
            }
        } catch (e) {
            // CSS.supports might throw in some browsers
        }
    }
    
    // 3. Safari-specific features
    if (isSafari) {
        // Features that should exist in Safari
        if (typeof window.ApplePaySession === 'undefined') {
            results.missingFeatures.push('apple_pay_session');
            results.consistencyScore -= 20;
        }
        
        if (!window.safari) {
            results.missingFeatures.push('safari_object');
            results.consistencyScore -= 20;
        }
        
        // Chrome-specific features shouldn't exist
        if (window.chrome) {
            results.unexpectedFeatures.push('chrome_object');
            results.consistencyScore -= 25;
        }
        
        // Firefox-specific features shouldn't exist
        if (typeof InstallTrigger !== 'undefined') {
            results.unexpectedFeatures.push('firefox_install_trigger');
            results.consistencyScore -= 25;
        }
    }
    
    // 4. Edge-specific features
    if (isEdge) {
        // Modern Edge is Chromium-based, so should have Chrome object
        if (!window.chrome) {
            results.missingFeatures.push('chrome_object');
            results.consistencyScore -= 20;
        }
        
        // Edge-specific properties
        if (window.chrome && !window.chrome.runtime) {
            results.missingFeatures.push('runtime_api');
            results.consistencyScore -= 15;
        }
        
        // Edge should never have this Internet Explorer feature
        if (document.documentMode) {
            results.unexpectedFeatures.push('document_mode');
            results.consistencyScore -= 20;
        }
    }
    
    // 5. General feature tests that work across browsers
    // These help detect basic bots that claim to be browsers but lack common features
    
    // Canvas support
    try {
        const canvas = document.createElement('canvas');
        const context2D = canvas && canvas.getContext && canvas.getContext('2d');
        
        if (!context2D) {
            results.missingFeatures.push('canvas_2d');
            results.consistencyScore -= 30; // Major red flag for bots
        } else {
            results.browserSpecificTests.canvasSupported = true;
        }
    } catch (e) {
        results.missingFeatures.push('canvas_error');
        results.consistencyScore -= 25;
    }
    
    // Audio support
    try {
        const audio = document.createElement('audio');
        if (!audio.canPlayType) {
            results.missingFeatures.push('audio_api');
            results.consistencyScore -= 20;
        } else {
            // Test for basic audio format support
            const mp3Support = audio.canPlayType('audio/mpeg').replace(/^no$/, '');
            const oggSupport = audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, '');
            
            results.browserSpecificTests.audioFormats = {
                mp3: !!mp3Support,
                ogg: !!oggSupport
            };
            
            // Most modern browsers support at least one of these
            if (!mp3Support && !oggSupport) {
                results.missingFeatures.push('common_audio_formats');
                results.consistencyScore -= 15;
            }
        }
    } catch (e) {
        results.missingFeatures.push('audio_error');
        results.consistencyScore -= 15;
    }
    
    // Storage APIs
    if (!window.localStorage || !window.sessionStorage) {
        results.missingFeatures.push('web_storage_api');
        results.consistencyScore -= 25; // Major red flag
    }
    
    // Fetch API
    if (!window.fetch) {
        // Almost all modern browsers support fetch
        results.missingFeatures.push('fetch_api');
        results.consistencyScore -= 15;
    }
    
    // Determine overall consistency
    results.isConsistent = results.consistencyScore > 70;
    results.highConfidence = results.consistencyScore > 90;
    
    return results;
}

export function checkCrossPropertyConsistency() {
    const results = {
        inconsistencies: [],
        score: 0
    };
    
    // Extract key properties for comparison
    const ua = navigator.userAgent.toLowerCase();
    const appVersion = navigator.appVersion;
    const platform = navigator.platform;
    const oscpu = navigator.oscpu; // Mozilla-specific, undefined in other browsers
    const languages = navigator.languages || [];
    const language = navigator.language || '';
    const connection = navigator.connection;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const deviceMemory = navigator.deviceMemory || 0;
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;
    
    // 1. OS/Platform consistency checks
    
    // Windows detection consistency
    const isWindowsUA = /windows|win64|win32/i.test(ua);
    const isWindowsPlatform = /win/i.test(platform);
    if (isWindowsUA !== isWindowsPlatform) {
        results.inconsistencies.push('windows_detection_mismatch');
        results.score += 20;
    }
    
    // macOS detection consistency
    const isMacUA = /macintosh|mac os/i.test(ua);
    const isMacPlatform = /mac/i.test(platform);
    if (isMacUA !== isMacPlatform) {
        results.inconsistencies.push('mac_detection_mismatch');
        results.score += 20;
    }
    
    // Linux detection consistency
    const isLinuxUA = /linux/i.test(ua) && !/android/i.test(ua);
    const isLinuxPlatform = /linux/i.test(platform) && !/android/i.test(platform);
    if (isLinuxUA !== isLinuxPlatform) {
        results.inconsistencies.push('linux_detection_mismatch');
        results.score += 20;
    }
    
    // Mobile consistency
    const isMobileUA = /android|iphone|ipad|ipod|mobile/i.test(ua);
    const hasTouchScreen = maxTouchPoints > 0;
    
    // Mobile devices should have touch capabilities
    if (isMobileUA && !hasTouchScreen) {
        results.inconsistencies.push('mobile_without_touch');
        results.score += 15;
    }
    
    // Desktop devices rarely have many touch points
    if (!isMobileUA && maxTouchPoints > 2 && !/touch/i.test(ua)) {
        results.inconsistencies.push('desktop_with_multitouch');
        results.score += 10;
    }
    
    // 2. Browser engine vs features consistency
    
    // Chrome browser consistency
    const isChrome = /chrome/i.test(ua) && !/edg|edge/i.test(ua);
    const hasChromeObj = !!window.chrome;
    if (isChrome !== hasChromeObj) {
        results.inconsistencies.push('chrome_object_mismatch');
        results.score += 25;
    }
    
    // Firefox browser consistency
    const isFirefox = /firefox/i.test(ua);
    const hasFirefoxSpecific = typeof InstallTrigger !== 'undefined';
    if (isFirefox !== hasFirefoxSpecific) {
        results.inconsistencies.push('firefox_feature_mismatch');
        results.score += 25;
    }
    
    // 3. Hardware vs Performance consistency
    
    // Check if deviceMemory and hardwareConcurrency make sense together
    if (deviceMemory > 0 && hardwareConcurrency > 0) {
        // High memory with very low core count is suspicious
        if (deviceMemory >= 8 && hardwareConcurrency <= 1) {
            results.inconsistencies.push('high_memory_low_cores');
            results.score += 15;
        }
        
        // Very high core count with low memory is suspicious
        if (hardwareConcurrency >= 16 && deviceMemory <= 2) {
            results.inconsistencies.push('high_cores_low_memory');
            results.score += 15;
        }
    }
    
    // 4. Timezone vs Language/Locale consistency
    
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneCountry = timezone.split('/')[0];
        
        // Parse language to get primary language code
        const primaryLanguage = language.split('-')[0].toLowerCase();
        
        // Define suspicious timezone/language combinations
        const suspiciousCombinations = [
            { timezone: 'Asia', language: 'en', excludeCountries: ['Singapore', 'Hong Kong', 'Philippines'] },
            { timezone: 'Asia/China', language: 'en' },
            { timezone: 'Asia/Seoul', language: 'en' },
            { timezone: 'Asia/Tokyo', language: 'en' },
            { timezone: 'Europe', language: 'zh' },
            { timezone: 'Europe', language: 'ja' },
            { timezone: 'Europe', language: 'ko' },
            { timezone: 'America', language: 'zh' },
            { timezone: 'America', language: 'ja' },
            { timezone: 'America', language: 'ar', excludeCountries: ['Araguaina'] }
        ];
        
        for (const combo of suspiciousCombinations) {
            if (timezone.includes(combo.timezone) && primaryLanguage === combo.language) {
                // Check for exclusions
                let excluded = false;
                if (combo.excludeCountries) {
                    excluded = combo.excludeCountries.some(country => timezone.includes(country));
                }
                
                if (!excluded) {
                    results.inconsistencies.push(`timezone_language_mismatch_${combo.timezone}_${combo.language}`);
                    results.score += 15;
                    break;
                }
            }
        }
    } catch (e) {
        // Intl API might not be available
    }
    
    // 5. Browser version consistency
    
    // Extract Chrome version from UA and compare across properties
    const chromeVersionMatch = ua.match(/chrome\/(\d+)/i);
    if (chromeVersionMatch && window.chrome) {
        const uaChromeVersion = parseInt(chromeVersionMatch[1], 10);
        
        // In recent Chrome, these APIs should be present
        if (uaChromeVersion >= 80) {
            if (!('clipboard' in navigator)) {
                results.inconsistencies.push('missing_recent_chrome_api');
                results.score += 15;
            }
            
            if (!('serial' in navigator) && uaChromeVersion >= 89) {
                results.inconsistencies.push('missing_recent_chrome_api_serial');
                results.score += 15;
            }
        }
    }
    
    // 6. Connection type consistency
    if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        // Browser on mobile UA should typically report connection information consistently
        if (isMobileUA && effectiveType === '4g' && downlink < 1) {
            results.inconsistencies.push('4g_with_slow_downlink');
            results.score += 10;
        }
        
        // Desktop with extremely slow reported connection is suspicious
        if (!isMobileUA && effectiveType === 'slow-2g' && appVersion.includes('Windows')) {
            results.inconsistencies.push('desktop_with_very_slow_connection');
            results.score += 15;
        }
    }
    
    // 7. Screen dimensions and color depth consistency
    
    const screen = window.screen || {};
    if (screen) {
        // Most modern displays have color depth of at least 24
        if (screen.colorDepth < 24 && !isWindowsUA.includes('windows nt 5')) { // Exclude Windows XP
            results.inconsistencies.push('low_color_depth');
            results.score += 10;
        }
        
        // Unusual/artificial dimensions
        if ((screen.width === 1000 && screen.height === 1000) || 
            (screen.width === 2000 && screen.height === 2000)) {
            results.inconsistencies.push('artificial_screen_dimensions');
            results.score += 15;
        }
        
        // Inconsistent pixel ratio
        const pixelRatio = window.devicePixelRatio || 1;
        if (isMobileUA && pixelRatio < 1.5 && screen.width > 760) {
            results.inconsistencies.push('mobile_with_low_pixel_ratio');
            results.score += 10;
        }
    }
    
    // 8. Plugin count vs browser type consistency
    const pluginCount = navigator.plugins?.length || 0;
    
    // Chrome and Firefox typically have default plugins
    if ((isChrome || isFirefox) && pluginCount === 0 && !isMobileUA) {
        results.inconsistencies.push('zero_plugins_in_desktop_browser');
        results.score += 20;
    }
    
    // Safari mobile shouldn't have plugins
    if (isMobileUA && ua.includes('safari') && !ua.includes('chrome') && pluginCount > 0) {
        results.inconsistencies.push('mobile_safari_with_plugins');
        results.score += 15;
    }
    
    // Final result
    return {
        inconsistencies: results.inconsistencies,
        suspicionScore: results.score,
        isConsistent: results.score < 30
    };
}

export function evaluateNavigatorConsistency(results) {
    let suspicionScore = 0;
    
    // 1. Evaluate basic checks
    if (results.webdriver) {
        suspicionScore += 40; // Webdriver flag is a strong signal
    }
    
    const userAgentResults = results.userAgentConsistency || {};
    if (userAgentResults.isLikelyModified) {
        suspicionScore += 30;
    } else if (userAgentResults.suspicionScore > 15) {
        suspicionScore += 15;
    }
    
    const languageResults = results.languagesConsistency || {};
    if (languageResults.isLikelySpoofed) {
        suspicionScore += 25;
    } else if ((languageResults.inconsistencies || []).length > 0) {
        suspicionScore += 10;
    }
    
    // Zero plugins is suspicious in desktop browsers, but normal in some mobile browsers
    if (results.pluginsLength === 0 && !(/mobile|android|iphone|ipad/i.test(navigator.userAgent))) {
        suspicionScore += 15;
    }
    
    // 2. Evaluate property tampering
    const tampering = results.propertyTampering || {};
    if (tampering.highConfidenceTampering) {
        suspicionScore += 50; // Definite tampering is very suspicious
    } else if (tampering.isTampered) {
        suspicionScore += 30;
    } else if (tampering.score > 10) {
        suspicionScore += 15;
    }
    
    // 3. Evaluate hardware consistency
    const hardware = results.hardwareChecks || {};
    const hardwareConsistency = hardware.hardwareConsistency || {};
    
    if (hardware.hardwareConcurrency === 1 && hardware.deviceMemory > 2) {
        suspicionScore += 15; // Unusual hardware configuration
    }
    
    if (!hardwareConsistency.isConsistent) {
        suspicionScore += 20;
    } else if ((hardwareConsistency.inconsistencies || []).length > 0) {
        suspicionScore += hardwareConsistency.inconsistencies.length * 5;
    }
    
    // 4. Evaluate browser features
    const featureChecks = results.browserFeatureChecks || {};
    if (!featureChecks.isConsistent) {
        suspicionScore += 35;
    } else if (featureChecks.consistencyScore < 80) {
        suspicionScore += 20;
    }
    
    // Missing critical features is highly suspicious
    if ((featureChecks.missingFeatures || []).length >= 3) {
        suspicionScore += 40;
    }
    
    // Having features from wrong browser type is very suspicious
    if ((featureChecks.unexpectedFeatures || []).length > 0) {
        suspicionScore += 30;
    }
    
    // 5. Evaluate cross-property consistency
    const crossConsistency = results.crossPropertyConsistency || {};
    if (crossConsistency.suspicionScore > 30) {
        suspicionScore += 35;
    } else if (crossConsistency.suspicionScore > 15) {
        suspicionScore += 20;
    }
    
    // 6. Apply context-specific logic
    
    // If multiple major indicators are present together, increase score significantly
    let majorIndicatorsCount = 0;
    
    if (results.webdriver) majorIndicatorsCount++;
    if (tampering.highConfidenceTampering) majorIndicatorsCount++;
    if (featureChecks.consistencyScore < 70) majorIndicatorsCount++;
    if (crossConsistency.suspicionScore > 40) majorIndicatorsCount++;
    if ((hardwareConsistency.inconsistencies || []).length >= 3) majorIndicatorsCount++;
    
    if (majorIndicatorsCount >= 3) {
        suspicionScore += 50; // Multiple major indicators strongly suggest automation
    } else if (majorIndicatorsCount === 2) {
        suspicionScore += 25;
    }
    
    // Presence of specific automation patterns
    if (userAgentResults.botPattern || 
        (languageResults.inconsistencies || []).includes('suspicious_language_timezone')) {
        suspicionScore += 20;
    }
    
    // 7. Cap the score at a maximum value
    return Math.min(suspicionScore, 100);
}