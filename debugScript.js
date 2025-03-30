const cors = require('cors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { buildSuites } = require('./build-test-suite/src/build');
const { assignTestSuite, createChallengeForRequest, getAndVerifyChallenge, verifyAutoTests, updateChallengeStatus, STATUS, CaptchaError } = require('./challengeUtils');

const suiteCache = new Map();
const challengeCache = new Map();
const interactiveChallengeCache = new Map();

// Define baseSuiteDir needed for serving suite files
const baseSuiteDir = process.env.SUITES_BASE_DIR || path.join(os.tmpdir(), 'captcha-suites');
if (!fs.existsSync(baseSuiteDir)) {
  fs.mkdirSync(baseSuiteDir, { recursive: true });
}

// Create debug server
async function startDebugServer(port = 3000) {
  console.log('Starting CAPTCHA debug server...');
  
  // Build a single suite for testing
  console.log('Building test suite...');
  const suites = await buildSuites(1, baseSuiteDir);
  const testSuite = suites[0];
  console.log(`Created test suite: ${testSuite.suiteId}`);
  
  // Get suite paths
  const suiteDir = testSuite.path;
  const suiteJsPath = path.join(suiteDir, 'test-suite.src.js');
  const suiteDataPath = path.join(suiteDir, 'suite-data.json');
  
  // Read suite data
  const suiteData = JSON.parse(fs.readFileSync(suiteDataPath, 'utf-8'));
  suiteCache.set(testSuite.suiteId, suiteData);
  
  // Setup debug directory
  const debugDir = path.join(__dirname, 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
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
  
  
  // API endpoint to request a challenge
  app.post('/api/request-challenge', (req, res) => {
    
    // Log request details
    console.log('Challenge requested:');
    console.log('Request headers:', req.headers);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const selectedSuiteData = assignTestSuite(suiteCache);
      console.log('Selected suite data for challenge:', selectedSuiteData.suiteId);

      const challenge = createChallengeForRequest(selectedSuiteData, req);
      updateChallengeStatus(challenge, STATUS.SERVED);
      challengeCache.set(challenge.id, challenge);
      console.log('Sending challenge:', challenge);
      res.json(challenge);
    } catch (error) {
      console.error("Error requesting challenge:", error);
      res.status(500).json({ error: 'Failed to create challenge' });
    }
  });

  // API endpoint to serve the test suite file
  app.get('/suite/:suiteId', (req, res) => {
    try {
      // 1. Verify the challenge token from the header
      const challenge = getAndVerifyChallenge(req, challengeCache, STATUS.SERVED);
      
      // 2. Check if the requested suiteId matches the one in the challenge
      if (req.params.suiteId === challenge.suiteId) {
        // 3. Check if the suite file exists (using the path from the build step)
        const requestedSuiteJsPath = path.join(baseSuiteDir, req.params.suiteId, 'test-suite.src.js'); // Adjust if using obfuscated version
        
        if (fs.existsSync(requestedSuiteJsPath)) {
          console.log(`Serving suite file for valid challenge ${challenge.id}: ${requestedSuiteJsPath}`);
          res.sendFile(requestedSuiteJsPath);
          updateChallengeStatus(challenge, STATUS.AUTO_PENDING);
        } else {
          console.error(`Suite file not found for suiteId ${req.params.suiteId} at ${requestedSuiteJsPath}`);
          res.status(404).send('Suite file not found.');
        }
      } else {
        console.warn(`Suite ID mismatch for challenge ${challenge.id}. Requested: ${req.params.suiteId}, Expected: ${challenge.suiteId}`);
        res.status(403).send('Forbidden: Suite ID mismatch.');
      }
    } catch (error) {
      console.error("Error serving suite file:", error);
      if (error.code) { // Check if it's a CaptchaError
          res.status(400).json({ 
              errorCode: error.code, 
              message: error.message
          });
      } else {
          res.status(500).json({ 
              errorCode: 'SERVER_ERROR', 
              message: 'Internal server error serving suite file.' 
          });
      }
    }
  });

  // API endpoint to verify captcha results
  app.post('/api/verify-captcha', async (req, res) => {
    console.log('Verification received:');
    console.log(JSON.stringify(req.body, null, 2));

    let challenge; // Define challenge in the outer scope
    try {
      // 1. Get and validate the challenge (ensure it's in SERVED state)
      challenge = getAndVerifyChallenge(req, challengeCache, STATUS.AUTO_PENDING);

      // 2. Retrieve the corresponding suite data
      const suiteData = suiteCache.get(challenge.suiteId);
      if (!suiteData) {
        throw new CaptchaError('SUITE_DATA_MISSING', {
          message: `Suite data not found for suite ID: ${challenge.suiteId}`,
          details: { suiteId: challenge.suiteId }
        });
      }

      // 3. Perform the automatic tests verification
      const result = await verifyAutoTests(req.body, challenge, suiteData);

      console.log('Automatic verification result:', result);

      // Save the auto test result without the interactive challenge
      const autoResultToSave = { ...result };
      if (autoResultToSave.interactiveChallenge) {
        delete autoResultToSave.interactiveChallenge;
      }
      challenge.autoVerificationResult = autoResultToSave;

      // 4. Determine next status and prepare response payload
      let responsePayload;
      let nextStatus;

      if (result.interactiveChallenge) {
        // Interactive challenge required
        nextStatus = STATUS.INTERACTIVE_PENDING;
        const interactiveChallenge = result.interactiveChallenge;
        challenge.interactiveChallengeId = interactiveChallenge.id; // Save reference ID
        interactiveChallengeCache.set(interactiveChallenge.id, interactiveChallenge); // Store full details

        responsePayload = {
          valid: false,
          requiresInteractiveChallenge: true,
          interactiveChallenge: {
            id: interactiveChallenge.id,
            testId: interactiveChallenge.testId,
            clientParams: interactiveChallenge.clientParams
          }
        };

      } else if (result.valid) {
        // Auto tests passed, verification successful
        nextStatus = STATUS.COMPLETED_SUCCESS;
        responsePayload = {
          valid: true,
          requiresInteractiveChallenge: false,
          message: "Verification successful."
        };

      } else {
        // Auto tests failed, verification failed
        nextStatus = STATUS.COMPLETED_FAILURE;
        responsePayload = {
          valid: false,
          requiresInteractiveChallenge: false,
          message: 'Automatic tests failed.',
          errorCode: 'AUTO_TESTS_FAILED'
        };
      }

      // 5. Update challenge status
      updateChallengeStatus(challenge, nextStatus, challengeCache, statusDetails);
      res.json(responsePayload);
    } catch (error) {
      console.error("Verification endpoint error:", error);
      // If challenge exists, attempt to mark it as failed due to error
      if (challenge && challenge.id && challengeCache.has(challenge.id)) {
         try {
             // Only update if not already completed
             if (challenge.status !== STATUS.COMPLETED_SUCCESS && challenge.status !== STATUS.COMPLETED_FAILURE) {
                 updateChallengeStatus(challenge, STATUS.COMPLETED_FAILURE, challengeCache, { error: `Auto verification endpoint error: ${error.message}` });
             }
         } catch (statusError) {
             console.error("Failed to update challenge status on error:", statusError);
         }
      }
      // Send appropriate error response based on CaptchaError or generic error
      if (error.code) {
          res.status(400).json({
              valid: false,
              errorCode: error.code,
              message: error.message,
              details: error.details
          });
      } else {
          res.status(500).json({
              valid: false,
              errorCode: 'SERVER_ERROR',
              message: 'Internal server error during verification.'
          });
      }
    }
  });

  // API endpoint to verify interactive captcha results
  app.post('/api/verify-interactive-captcha', async (req, res) => {
    console.log('Interactive verification received:');
    console.log(JSON.stringify(req.body, null, 2));

    let originalChallenge; // Define in outer scope for cleanup
    let interactiveChallengeId; // Define in outer scope for cleanup
    try {
      // 1. Get and validate the *original* challenge (must be INTERACTIVE_PENDING)
      originalChallenge = getAndVerifyChallenge(req, challengeCache, STATUS.INTERACTIVE_PENDING);

      // 2. Get the interactive challenge submission from the request body
      const interactiveSubmission = req.body.interactiveResult;
      if (!interactiveSubmission || !interactiveSubmission.id) {
          throw new CaptchaError('MISSING_INTERACTIVE_ID', {
              message: 'Interactive challenge ID missing in submission.',
              details: {}
          });
      }
      interactiveChallengeId = interactiveSubmission.id;

      // Check: Compare submitted ID with stored ID ---
      if (interactiveChallengeId !== originalChallenge.interactiveChallengeId) {
        throw new CaptchaError('INTERACTIVE_ID_MISMATCH', {
            message: 'Submitted interactive challenge ID does not match the expected ID.',
            details: {
                submittedId: interactiveChallengeId,
                expectedId: originalChallenge.interactiveChallengeId
            }
        });
      }

      // 3. Retrieve the stored interactive challenge data (including verificationParams)
      const storedInteractiveData = interactiveChallengeCache.get(interactiveChallengeId);
      if (!storedInteractiveData || !storedInteractiveData.verificationParams) {
          throw new CaptchaError('INTERACTIVE_CHALLENGE_NOT_FOUND', {
              message: `Interactive challenge data not found or expired for ID: ${interactiveChallengeId}`,
              details: { interactiveChallengeId }
          });
      }

      // 4. Verify interactive challenge expiry (using its own expiry time)
      if (Date.now() > storedInteractiveData.expiry) {
          throw new CaptchaError('INTERACTIVE_CHALLENGE_EXPIRED', {
              message: `Interactive challenge ${interactiveChallengeId} has expired.`,
              details: { interactiveChallengeId, expiry: storedInteractiveData.expiry, now: Date.now() }
          });
      }

      // 5. Retrieve the corresponding suite data using the original challenge's suiteId
      const suiteData = suiteCache.get(originalChallenge.suiteId);
      if (!suiteData) {
        throw new CaptchaError('SUITE_DATA_MISSING', {
          message: `Suite data not found for suite ID: ${originalChallenge.suiteId}`,
          details: { suiteId: originalChallenge.suiteId }
        });
      }

      // 6. Find the interactive test module implementation
      const testModule = captchaTests.getTestById(storedInteractiveData.originalTestId);
      if (!testModule || typeof testModule.verifyResult !== 'function') {
          throw new CaptchaError('INTERACTIVE_TEST_MODULE_INVALID', {
              message: `Interactive test module invalid or missing verifyResult for ID: ${storedInteractiveData.originalTestId}`,
              details: { originalId: storedInteractiveData.originalTestId }
          });
      }

      // 7. Call the test module's verifyResult for the interactive test
      const interactiveVerification = await testModule.verifyResult(
          interactiveSubmission, // Client's answer
          storedInteractiveData.verificationParams // Server-side verification data
      );

      // 8. Determine final status and response based on interactive result
      let nextStatus;
      let responsePayload;

      if (interactiveVerification.valid) {
          nextStatus = STATUS.COMPLETED_SUCCESS;
          responsePayload = {
              valid: true,
              message: "Verification successful."
          };
      } else {
          nextStatus = STATUS.COMPLETED_FAILURE;
          responsePayload = {
              valid: false,
              errorCode: 'INTERACTIVE_FAILED',
              message: 'Interactive verification failed.',
              details: interactiveVerification.details
          };
      }

      // 9. Update the original challenge status
      originalChallenge.interactiveVerificationResult = interactiveVerification; // Store result
      originalChallenge = updateChallengeStatus(originalChallenge, nextStatus, challengeCache, statusDetails);

      console.log('Final verification result:', responsePayload);
      res.json(responsePayload);

    } catch (error) {
      console.error("Interactive verification endpoint error:", error);
      if (originalChallenge && originalChallenge.id && challengeCache.has(originalChallenge.id)) {
          try {
              if (originalChallenge.status !== STATUS.COMPLETED_SUCCESS && originalChallenge.status !== STATUS.COMPLETED_FAILURE) {
                  updateChallengeStatus(originalChallenge, STATUS.COMPLETED_FAILURE, challengeCache, { error: `Interactive verification endpoint error: ${error.message}` });
              }
          } catch (statusError) {
              console.error("Failed to update challenge status on error:", statusError);
          }
      }

      if (error.code) {
          res.status(400).json({
              valid: false,
              errorCode: error.code,
              message: error.message,
              details: error.details
          });
      } else {
          res.status(500).json({
              valid: false,
              errorCode: 'SERVER_ERROR',
              message: 'Internal server error during interactive verification.'
          });
      }
    }
  });

  // Copy frontend files to debug directory
  copyFrontendFiles(path.join(__dirname, 'captcha-site', 'public'), debugDir);
    
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

// When run directly
if (require.main === module) {
  const port = parseInt(process.argv[2] || '3000', 10);
  startDebugServer(port).catch(console.error);
}

module.exports = { startDebugServer };

