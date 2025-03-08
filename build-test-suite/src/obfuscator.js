const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const Terser = require('terser');

async function obfuscateSuite(suiteInfo) {
  const { suiteId, suiteDir } = suiteInfo;
  
  // Read the source suite
  let sourceCode = fs.readFileSync(path.join(suiteDir, 'test-suite.src.js'), 'utf8');
  
  // Add runtime debug protection
  sourceCode = addDebugProtections(sourceCode);
  
  // Generate unique obfuscation options for this suite
  const obfuscationOptions = generateUniqueObfuscationOptions(suiteId);
  
  // Apply obfuscation
  const obfuscatedResult = JavaScriptObfuscator.obfuscate(
    sourceCode,
    obfuscationOptions
  );
  
  // Save obfuscated code
  fs.writeFileSync(
    path.join(suiteDir, 'test-suite.js'),
    obfuscatedResult.getObfuscatedCode()
  );
  
  // Save minified version
  const minified = await minifyCode(obfuscatedResult.getObfuscatedCode());
  fs.writeFileSync(
    path.join(suiteDir, 'test-suite.min.js'),
    minified
  );
  
  return {
    ...suiteInfo,
    obfuscationOptions
  };
}

function generateUniqueObfuscationOptions(suiteId) {
  const seed = parseInt(suiteId.replace(/[^0-9]/g, '').substring(0, 8), 10);
  
  return {
    // Core settings - minimal impact
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: true,            // ENABLE: basic debugging prevention
    debugProtectionInterval: 4000,    // Long interval = minimal performance impact
    disableConsoleOutput: true,
    
    // Rename variables and transform strings
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    
    // Selective string array features
    stringArray: true,                // ENABLE: basic string protection
    stringArrayThreshold: 0.3,        // Only protect 30% of strings (most important ones)
    rotateStringArray: true,          // ENABLE: rotate string order
    shuffleStringArray: true,         // ENABLE: shuffle string order
    stringArrayEncoding: [],          // Still no encoding (performance-heavy)
    
    // Other settings
    selfDefending: false,
    splitStrings: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: true,
    
    seed: seed,
    target: 'browser'
  };
}

// Predictable random number generator for deterministic but varied obfuscation
class PseudoRandom {
  constructor(seed) {
    this.seed = seed;
    this.m = 2**35 - 31;
    this.a = 185852;
    this.c = 1;
    this.state = seed % this.m;
  }
  
  next() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }
}

async function minifyCode(code) {
  try {
    // More aggressive minification with Terser
    const result = await Terser.minify(code, {
      compress: {
        dead_code: true,
        drop_debugger: false, // Keep deliberate debugger statements
        global_defs: {
          "@console.log": "undefined" // Replace console.logs
        },
        passes: 3 // Multiple compression passes
      },
      mangle: {
        properties: {
          // Mangle property names that aren't exposed to outside code
          regex: /^_/
        }
      },
      output: {
        beautify: false
      }
    });
    
    return result.code;
  } catch (error) {
    console.error("Minification error:", error);
    return code; // Return original code if minification fails
  }
}

// Advanced runtime checks to detect debugging attempt
function addDebugProtections(originalCode) {
  // Add these protections to your JavaScript
  const protections = `
    // Self-executing protection code
    (function() {
      // Get security token from query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const securityToken = urlParams.get('token') || '';
      const startTime = Date.now();
      
      // 1. Timing-based detection
      function checkDebuggerTiming() {
        const marker = Date.now();
        
        // This block shouldn't take more than a few ms
        for(let i=0; i<100; i++) {
          // Empty operations that will be much slower under debugger
        }
        
        const elapsed = Date.now() - marker;
        
        // If execution is suspiciously slow, take action
        if (elapsed > 100) {
          antiDebugAction();
        }
      }
      
      // 2. Console modifications detection
      const originalConsole = {
        log: window.console.log,
        warn: window.console.warn,
        error: window.console.error,
        debug: window.console.debug
      };
      
      function checkConsoleManipulation() {
        // Check if console methods have been tampered with
        if (window.console.log.toString().length !== originalConsole.log.toString().length) {
          antiDebugAction();
        }
      }
      
      // 3. Function.toString detection
      const keyFunctions = [];
      keyFunctions.push(checkDebuggerTiming);
      
      const functionsToString = keyFunctions.map(f => f.toString());
      
      function checkFunctionIntegrity() {
        for(let i=0; i<keyFunctions.length; i++) {
          if (keyFunctions[i].toString() !== functionsToString[i]) {
            antiDebugAction();
          }
        }
      }
      
      // 4. DevTools detection via window.height
      function checkDevTools() {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
          antiDebugAction();
        }
      }
      
      // 5. Performance.now() precision
      function checkPerformanceAPI() {
        let previousTime = performance.now();
        let patterns = [];
        
        // Collect timing patterns
        for(let i=0; i<10; i++) {
          const now = performance.now();
          patterns.push(now - previousTime);
          previousTime = now;
        }
        
        // Check for unusual precision patterns that indicate debugging
        const suspiciousPrecision = patterns.filter(t => t === 0 || t > 10).length > 3;
        if (suspiciousPrecision) {
          antiDebugAction();
        }
      }
      
      // 6. Break on property access
      function setupPropertyTraps() {
        // Create trap properties that trigger when accessed by debugger
        const trapProps = ["__proto__", "constructor", "prototype"];
        
        const protection = {};
        trapProps.forEach(prop => {
          Object.defineProperty(protection, prop, {
            get: function() {
              antiDebugAction();
              return null;
            }
          });
        });
        
        window._protection = protection;
      }
      
      // Take action when debugging is detected
      function antiDebugAction() {
        // Report attempt with comprehensive data
        const reportEndpoint = "/api/security/debug-detected";
        
        // Get stored request ID if available
        const requestId = localStorage.getItem('captchaRequestId') || generateUUID();
        
        // Collect all relevant data
        const reportData = {
          // Event metadata
          type: "debug-detected",
          debugType: detectDebuggerType(),
          requestId: requestId,
          timestamp: Date.now(),
          token: securityToken,
          pageUrl: window.location.href,
          referrer: document.referrer,
          
          // Environment data
          environment: {
            // Screen properties
            screen: {
              width: window.screen.width,
              height: window.screen.height,
              availWidth: window.screen.availWidth,
              availHeight: window.screen.availHeight,
              colorDepth: window.screen.colorDepth,
              pixelDepth: window.screen.pixelDepth,
              orientation: window.screen.orientation?.type
            },
            
            // Window properties
            window: {
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              outerWidth: window.outerWidth,
              outerHeight: window.outerHeight,
              devicePixelRatio: window.devicePixelRatio
            },
            
            // Browser capabilities
            browser: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
              languages: navigator.languages,
              doNotTrack: navigator.doNotTrack,
              cookieEnabled: navigator.cookieEnabled,
              hardwareConcurrency: navigator.hardwareConcurrency || 0,
              deviceMemory: navigator.deviceMemory || 0,
              maxTouchPoints: navigator.maxTouchPoints || 0
            },
            
            // Time & location info
            timeZone: {
              offset: new Date().getTimezoneOffset(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          },
          
          // Behavioral data
          behavior: window._userInteractions ? {
            pageLoadTime: performance.now(),
            userInteractionCount: window._userInteractions || 0,
            formInteractions: window._formInteractions || 0,
            mouseMovements: window._mouseMovements || 0,
            keyPresses: window._keyPresses || 0,
            scrollEvents: window._scrollEvents || 0,
            timeOnPage: performance.now(),
            focusBlurEvents: window._focusEvents || 0
          } : {}
        };
        
        // Send non-blocking report
        navigator.sendBeacon(reportEndpoint, JSON.stringify(reportData));
        
        // Corrupt local state to confuse debugger
        window.localStorage.clear();
        
        // Execute misleading code
        const sensitiveInfo = {
          apiKeys: ["fake-key-" + Math.random().toString(36).substring(7)],
          userInfo: {id: Math.floor(Math.random() * 1000000)}
        };
        window._sensitiveData = sensitiveInfo;
      }
      
      // Helper to detect what kind of debugging is happening
      function detectDebuggerType() {
        const devtoolsHeight = window.outerHeight - window.innerHeight > 100;
        const devtoolsWidth = window.outerWidth - window.innerWidth > 100;
        
        if (devtoolsHeight) return "devtools-bottom";
        if (devtoolsWidth) return "devtools-side";
        
        // More specific detection could be added here
        return "unknown";
      }
      
      // UUID generator (copied from main code)
      function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      
      // Schedule these checks at random intervals
      function scheduleChecks() {
        const checks = [
          checkDebuggerTiming,
          checkConsoleManipulation,
          checkFunctionIntegrity,
          checkDevTools,
          checkPerformanceAPI
        ];
        
        checks.forEach(check => {
          const delay = 500 + Math.random() * 3000;
          setTimeout(check, delay);
          
          // Re-schedule checks at random intervals
          setInterval(check, 2000 + Math.random() * 10000);
        });
      }
      
      // Add debugger trap that triggers in debugging conditions
      function addDebuggerTraps() {
        function trap() {
          if (new Date().getTime() - startTime > 100) {
            debugger;
          }
        }
        
        // Execute traps periodically
        setInterval(trap, 1000);
      }
      
      // Initialize all protections
      setupPropertyTraps();
      scheduleChecks();
      addDebuggerTraps();
    })();
  `;
  
  return originalCode + "\n" + protections;
}

module.exports = { obfuscateSuite };