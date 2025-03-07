const cors = require('cors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { buildSuites } = require('./build-test-suite/src/build');
const crypto = require('crypto');

// Create debug server
async function startDebugServer(port = 3000) {
  console.log('Starting CAPTCHA debug server...');
  
  // Build a single suite for testing
  console.log('Building test suite...');
  const suites = await buildSuites(1);
  const testSuite = suites[0];
  console.log(`Created test suite: ${testSuite.suiteId}`);
  
  // Get suite paths
  const suiteDir = testSuite.path;
  const suiteJsPath = path.join(suiteDir, 'test-suite.src.js');
  const suiteDataPath = path.join(suiteDir, 'suite-data.json');
  
  // Read suite data
  const suiteData = JSON.parse(fs.readFileSync(suiteDataPath, 'utf-8'));
  
  // Generate a simple challenge - this would normally be done by the server per request and saved in a database
  const challenge = {
    id: `challenge-${Date.now()}`,
    suiteId: testSuite.suiteId,
    suiteUrl: `/suite/${testSuite.suiteId}`,
    timestamp: Date.now(),
    token: 'debug-token-12345',
    powDifficulty: 2,  // Reduced for faster testing
    powPrefix: 'debug',
    expiry: Date.now() + 300000 // 5 minutes
  };

  // Setup debug directory
  const debugDir = path.join(__dirname, 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
  // Copy frontend files to debug directory
  const sourceDir = path.join(__dirname, 'captcha-site', 'public');
  copyFrontendFiles(sourceDir, debugDir);
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
    next();
  });
  
  // Serve static files from debug directory
  app.use(express.static(debugDir));
  
  // Serve suite file
  app.get('/suite/:suiteId', (req, res) => {
    if (req.params.suiteId === testSuite.suiteId) {
      res.sendFile(suiteJsPath);
    } else {
      res.status(404).send('suite not found');
    }
  });
  
  // API endpoint to request a challenge
  app.post('/api/request-challenge', (req, res) => {
    console.log('Challenge requested:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // Log headers for debugging
    console.log('Request headers:', req.headers);
    console.log('Sending challenge:', challenge);
    res.json(challenge);
  });
  
  // API endpoint to verify captcha results
  app.post('/api/verify-captcha', async (req, res) => {
    console.log('Verification received:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // For debug server, show detailed verification process
    const verification = await verifyResults(req.body, challenge, suiteData);
    
    console.log('Verification result:', verification);
    res.json(verification);
  });
  
  // Start server
  app.listen(port, () => {
    console.log(`Debug server running at http://localhost:${port}`);
    console.log(`Test suite ID: ${testSuite.suiteId}`);
    console.log(`Debug frontend available at http://localhost:${port}/index.html`);
  });
}

// Copy frontend files to debug directory
function copyFrontendFiles(sourceDir, targetDir) {
  console.log(`Copying frontend files from ${sourceDir} to ${targetDir}`);
  
  // Create css directory if it doesn't exist
  const cssDir = path.join(targetDir, 'css');
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }
  
  // Create js directory if it doesn't exist
  const jsDir = path.join(targetDir, 'js');
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
  }
  
  try {
    // Copy index.html
    fs.copyFileSync(
      path.join(sourceDir, 'index.html'), 
      path.join(targetDir, 'index.html')
    );
    console.log('Copied index.html');
    
    // Copy captcha.js
    fs.copyFileSync(
      path.join(sourceDir, 'captcha.js'), 
      path.join(targetDir, 'js', 'captcha.js')
    );
    console.log('Copied captcha.js');
    
    // Copy CSS files if they exist
    const sourceCssDir = path.join(sourceDir, 'css');
    if (fs.existsSync(sourceCssDir)) {
      fs.readdirSync(sourceCssDir).forEach(file => {
        if (file.endsWith('.css')) {
          fs.copyFileSync(
            path.join(sourceCssDir, file),
            path.join(cssDir, file)
          );
          console.log(`Copied css/${file}`);
        }
      });
    } else {
      console.log('No CSS directory found, creating empty captcha.css');
      // Create an empty CSS file if none exists
      fs.writeFileSync(
        path.join(cssDir, 'captcha.css'),
        '/* Debug CSS file */'
      );
    }
    
    // Inject debug script into index.html
    injectDebugScript(path.join(targetDir, 'index.html'));
    
  } catch (error) {
    console.error('Error copying frontend files:', error);
  }
}

// Inject a debug logging script into the HTML
function injectDebugScript(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Create a debug panel script that will allow monitoring
  const debugScript = `
  <div id="debug-panel" style="position: fixed; bottom: 0; left: 0; right: 0; height: 200px; background: rgba(0,0,0,0.85); color: #0f0; font-family: monospace; font-size: 12px; padding: 10px; overflow-y: auto; display: none;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <strong>CAPTCHA Debug Panel</strong>
      <div>
        <button onclick="clearDebugLog()">Clear</button>
        <button onclick="toggleDebugPanel()">Close</button>
      </div>
    </div>
    <div id="debug-log"></div>
  </div>
  <button id="show-debug" style="position: fixed; bottom: 10px; right: 10px; z-index: 1000;">Show Debug</button>
  <script>
    // Debug panel functionality
    function toggleDebugPanel() {
      const panel = document.getElementById('debug-panel');
      const button = document.getElementById('show-debug');
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        button.style.display = 'none';
      } else {
        panel.style.display = 'none';
        button.style.display = 'block';
      }
    }
    
    function clearDebugLog() {
      document.getElementById('debug-log').innerHTML = '';
    }
    
    document.getElementById('show-debug').addEventListener('click', toggleDebugPanel);
    
    // Override console methods for debug panel
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };
    
    function appendToDebugLog(type, args) {
      const debugLog = document.getElementById('debug-log');
      const timestamp = new Date().toISOString().substring(11, 23);
      const message = Array.from(args).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      const color = type === 'error' ? '#ff5566' : type === 'warn' ? '#ffbb00' : '#00cc88';
      
      debugLog.innerHTML += \`<div style="color: \${color}; margin: 2px 0;"><span style="color: #777;">\${timestamp}</span> \${message}</div>\`;
      debugLog.scrollTop = debugLog.scrollHeight;
    }
    
    console.log = function() {
      originalConsole.log.apply(console, arguments);
      appendToDebugLog('log', arguments);
    };
    
    console.warn = function() {
      originalConsole.warn.apply(console, arguments);
      appendToDebugLog('warn', arguments);
    };
    
    console.error = function() {
      originalConsole.error.apply(console, arguments);
      appendToDebugLog('error', arguments);
    };
    
    // Capture fetch API for monitoring CAPTCHA interactions
    const originalFetch = window.fetch;
    window.fetch = function() {
      const url = arguments[0];
      const options = arguments[1] || {};
      
      console.log(\`API Request: \${options.method || 'GET'} \${url}\`);
      if (options.body) {
        try {
          const body = JSON.parse(options.body);
          console.log('Request payload:', body);
        } catch(e) {
          console.log('Request body:', options.body);
        }
      }
      
      return originalFetch.apply(this, arguments)
        .then(response => {
          // Clone the response to read its body
          const responseClone = response.clone();
          
          responseClone.json().then(data => {
            console.log(\`API Response from \${url}:\`, data);
          }).catch(() => {
            console.log(\`API Response from \${url} (not JSON)\`);
          });
          
          return response;
        })
        .catch(error => {
          console.error(\`API Error from \${url}:\`, error);
          throw error;
        });
    };
    
    console.log('Debug panel initialized');
  </script>`;
  
  // Insert the debug panel just before the closing body tag
  html = html.replace('</body>', `${debugScript}\n</body>`);
  
  fs.writeFileSync(htmlPath, html);
  console.log('Injected debug panel into index.html');
}

// Verification logic
async function verifyResults(submission, challenge, suiteData) {
  
  try {
    // First check challenge expiration (independent of any test)
    const expirationCheck = checkChallengeExpiration(challenge);
    if (!expirationCheck.valid) {
      console.log('Challenge expired:', expirationCheck);
      return {
        valid: false,
        challengeExpired: true,
        expirationDetails: expirationCheck,
        message: "Challenge has expired"
      };
    }

    console.log('Verifying proof of work...');
    const powValid = submission.powResult && 
                  submission.powResult.hash && 
                  submission.powResult.hash.startsWith('00');

    console.log('Evaluating test results...');
    const testEvaluations = new Map();
    suiteData.tests.filter((test) => test.isRealTest).forEach(async test => {
      console.log(`Evaluating test ${test.originalId}...`);
      const result = submission.challengeSolution.testResults[test.id];

      switch (test.originalId) {
        case 'token_verification':
          testEvaluations.set('token_verification', await evaluateTokenVerification(result, challenge, suiteData));
          break;
        default:
          console.log(`Unknown test type: ${test.originalId}`);
          throw new CaptchaError('UNKNOWN_TEST', {
            message: `Unknown test type: ${test.originalId}`
          });
      }
    });
    
    return {
      valid: true
    };
  } catch (error) {
    if (error instanceof CaptchaError) {
      // Return structured error response for known failure cases
      return {
        valid: false,
        errorCode: error.code,
        message: error.message,
        details: error.details
      };
    }
    
    // For unexpected errors, return minimal information
    console.error('Unexpected verification error:', error);
    return {
      valid: false,
      errorCode: 'VERIFICATION_ERROR',
      message: 'An unexpected error occurred during verification'
    };
  }
}


// When run directly
if (require.main === module) {
  const port = parseInt(process.argv[2] || '3000', 10);
  startDebugServer(port).catch(console.error);
}

module.exports = { startDebugServer };

// Custom error class for CAPTCHA validation
class CaptchaError extends Error {
  constructor(code, {message, details}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/**
 * Standalone challenge expiration check
 * @param {Object} challenge - Challenge data sent to client
 * @returns {Object} Expiration status information
 */
function checkChallengeExpiration(challenge) {
  const maxAge = 900000; // 15 minutes
  const challengeAge = Date.now() - challenge.timestamp;
  const challengeExpired = challengeAge > maxAge;
  
  return {
    valid: !challengeExpired,
    challengeAge,
    maxValidAge: maxAge,
    expiryTime: challenge.timestamp + maxAge,
    remainingTime: Math.max(0, (challenge.timestamp + maxAge) - Date.now())
  };
}

/**
 * Evaluates token verification test results
 * @param {Object} result - Client test result
 * @param {Object} challenge - Challenge data sent to client
 * @param {Object} suiteData - Suite configuration data
 * @returns {Object} Evaluation results with standardized format
 */
async function evaluateTokenVerification(result, challenge, suiteData) {
  console.log('Evaluating token verification result:', result);
  
  try {
    // Check if result is valid
    if (!result || result.error) {
      return {
        valid: false,
        botProbability: 0.9,
        confidence: 0.8,
        details: {
          hashValid: false,
          error: result?.error || 'Invalid test result'
        }
      };
    }
    
    // Extract required data
    const token = challenge.token;
    const challengeId = challenge.id;
    const timestamp = challenge.timestamp;

    // Retrieve transform seed from suite data
    const test = suiteData.tests.find(test => test.originalId === 'token_verification');
    const transformSeed = test.paramValues['PARAM_TRANSFORM_SEED'];
    
    // Calculate expected tokenHash using server-side implementation
    const expectedHash = await calculateClientCompatibleHash(
      token, 
      challengeId, 
      timestamp, 
      transformSeed
    );
    
    // Compare with received hash
    const hashValid = (result.tokenHash === expectedHash.substring(0, 16));
    
    // Check timing for anomalies
    const executionTime = result.duration;
    const timingNormal = executionTime > 5; // Minimum reasonable time
    const timingSuspicious = executionTime < 10 || executionTime > 5000;
    
    // Additional security checks
    const expectedRounds = (parseInt(transformSeed.substring(0, 2), 16) % 7) + 3;
    const roundsMatch = result.rounds === expectedRounds;
    
    // Calculate bot probability
    let botProbability = 0.1; // Start with low probability
    
    if (!hashValid) botProbability += 0.6;
    if (!roundsMatch) botProbability += 0.4;
    if (!timingNormal) botProbability += 0.2;
    if (timingSuspicious) botProbability += 0.1;
    
    // Cap probability between 0 and 1
    botProbability = Math.min(Math.max(botProbability, 0), 1);
    
    return {
      valid: hashValid && timingNormal && roundsMatch,
      botProbability,
      confidence: hashValid ? 0.95 : 0.8,
      details: {
        hashValid,
        timingNormal,
        roundsMatch,
        expectedHashPrefix: expectedHash.substring(0, 16),
        receivedHashPrefix: result.tokenHash,
        expectedRounds,
        reportedRounds: result.rounds,
        processingTime: result.duration
      }
    };
  } catch (error) {
    console.error('Error evaluating token verification:', error);
    return {
      valid: false,
      botProbability: 0.5,
      confidence: 0.3,
      details: {
        error: error.message
      }
    };
  }
}

/**
 * Calculates token hash using the client algorithm with environment-agnostic behavior
 */
async function calculateClientCompatibleHash(token, challengeId, timestamp, transformSeed) {
  // CRITICAL: Use explicit string conversion with consistent method
  // This prevents differences in implicit type conversion between environments
  const tokenStr = String(token);
  const challengeIdStr = String(challengeId);
  const timestampStr = timestamp.toString(); // Explicit toString() for numbers
  
  console.log('=== SERVER HASH CALCULATION ===');
  console.log(`Input parameters (after string conversion):`);
  console.log(`token: "${tokenStr}" (${typeof tokenStr})`);
  console.log(`challengeId: "${challengeIdStr}" (${typeof challengeIdStr})`);
  console.log(`timestamp: "${timestampStr}" (${typeof timestampStr})`);
  console.log(`seed: "${transformSeed}" (${typeof transformSeed})`);
  
  // Phase 1: Initial hash of token with challenge data
  let digest = await sha256(tokenStr + challengeIdStr + timestampStr);
  console.log('Initial hash:', digest);
  
  // Phase 2: Suite-specific transformation
  digest = await performSuiteTransform(digest, transformSeed);
  console.log('After suite transform:', digest);
  
  // Phase 3: Multiple rounds of computation
  const rounds = (parseInt(transformSeed.substring(0, 2), 16) % 7) + 3;
  console.log(`Calculated rounds: ${rounds}`);
  
  for (let i = 0; i < rounds; i++) {
    // IMPORTANT: Match client's string concatenation exactly
    const preHashInput = digest + i.toString() + tokenStr.substring(0, 8);
    console.log(`Round ${i} input: ${preHashInput.substring(0, 20)}...`);
    
    digest = await sha256(preHashInput);
    console.log(`Round ${i} after SHA:`, digest);
    
    digest = await applyRoundTransformation(digest, i, transformSeed);
    console.log(`Round ${i} after transform:`, digest);
  }
  
  console.log(`Final hash: ${digest}`);
  return digest;
}

// Suite-specific transformation function
async function performSuiteTransform(input, seed) {
  // Use the seed to create a unique transformation for each suite
  const seedValues = [];
  for (let i = 0; i < seed.length; i += 2) {
    seedValues.push(parseInt(seed.substring(i, i+2), 16));
  }
  
  // Apply transformations using seed values
  let result = input;
  for (let i = 0; i < seedValues.length && i < 8; i++) {
    const value = seedValues[i];
    const position = value % result.length;
    
    // Different transformations based on seed value
    if (value % 4 === 0) {
      result = result.substring(position) + result.substring(0, position);
    } else if (value % 4 === 1) {
      result = await sha256(result + value.toString());
    } else if (value % 4 === 2) {
      result = result.split('').reverse().join('');
    } else {
      result = await sha256(value.toString() + result);
    }
  }
  
  return result;
}

// Round-specific transformation function with consistent cross-environment behavior
async function applyRoundTransformation(input, round, seed) {
  const transformType = (parseInt(seed.substring(round % seed.length, round % seed.length + 2), 16) + round) % 5;
  console.log(`Round ${round} transform type: ${transformType}`);
  
  switch (transformType) {
    case 0: // Reverse substrings - no change needed
      const mid = Math.floor(input.length / 2);
      return input.substring(mid) + input.substring(0, mid);
      
    case 1: { // XOR with round number - fixed for cross-environment consistency
      // CRITICAL: Use explicit numeric conversions and bitwise operations
      // This ensures consistent behavior across all environments
      const result = [];
      for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        // Ensure the operation stays within 0-255 range with explicit modulo
        const xorValue = ((round + 1) * (i + 1)) % 256;
        // Use bitwise XOR (^) with explicit conversion back to valid char range
        const newCharCode = (charCode ^ xorValue) & 0xFF;
        result.push(String.fromCharCode(newCharCode));
      }
      return result.join('');
    }
      
    case 2: // Interleave halves - no change needed
      const firstHalf = input.substring(0, input.length/2);
      const secondHalf = input.substring(input.length/2);
      let interleaved = '';
      for (let i = 0; i < firstHalf.length; i++) {
        interleaved += firstHalf[i] + (secondHalf[i] || '');
      }
      return interleaved;
      
    case 3: // Add round signature - ensure consistent string conversion
      return await sha256(input + round.toString().repeat(round + 1));
      
    case 4: // Rotate by round number - use floor for consistent integer division
      const rotation = Math.floor((round + 1) * 3) % input.length;
      return input.substring(rotation) + input.substring(0, rotation);
      
    default:
      return input;
  }
}

// SHA-256 implementation with consistent encoding
async function sha256(message) {
  // Always convert input to string with consistent encoding
  const utf8Message = String(message);
  
  // Use UTF-8 explicitly to match browser's TextEncoder
  return crypto
    .createHash('sha256')
    .update(utf8Message, 'utf8')
    .digest('hex');
}
