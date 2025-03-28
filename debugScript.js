const cors = require('cors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { buildSuites } = require('./build-test-suite/src/build');
const { assignTestSuite, createChallengeForRequest, getAndVerifyChallenge, verifySubmission, createInteractiveChallenge } = require('./challengeUtils');

const suiteCache = new Map();
const challengeCache = new Map();

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
    
    const suiteData = assignTestSuite(suiteCache);
    console.log('Selected suite data for challenge:', suiteData);

    const challenge = createChallengeForRequest(suiteData);
    challengeCache.set(challenge.challengeId, challenge);
    console.log('Sending challenge:', challenge);
    res.json(challenge);
  });
  
  // Serve suite file
  app.get('/suite/:suiteId', (req, res) => {
    if (req.params.suiteId === testSuite.suiteId) {
      res.sendFile(suiteJsPath);
    } else {
      res.status(404).send('suite not found');
    }
  });

  // API endpoint to verify captcha results
app.post('/api/verify-captcha', async (req, res) => {
  console.log('Verification received:');
  console.log(JSON.stringify(req.body, null, 2));
  
  try {
    // 1. Get and validate the challenge using the token from the header
    const challenge = getAndVerifyChallenge(req, challengeCache); 
    
    // 2. Retrieve the corresponding suite data (assuming suiteId is in challenge)
    const suiteData = suiteCache.get(challenge.suiteId);
    if (!suiteData) {
      throw new Error(`Suite data not found for suite ID: ${challenge.suiteId}`); // Or use CaptchaError
    }

    // 3. Perform the verification using the validated challenge and suite data
    const verification = await verifySubmission(req.body, challenge, suiteData);
    
    console.log('Verification result:', verification);
    res.json(verification);

  } catch (error) {
    console.error("Verification endpoint error:", error);
    // Send appropriate error response based on CaptchaError or generic error
    if (error.code) { // Check if it's a CaptchaError
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

  try {
    // 1. Get and validate the challenge using the token from the header
    // Note: This assumes the interactive submission also includes the original challenge ID header
    const challenge = getAndVerifyChallenge(req, challengeCache); 

    // 2. Retrieve the corresponding suite data
    const suiteData = suiteCache.get(challenge.suiteId);
     if (!suiteData) {
      throw new Error(`Suite data not found for suite ID: ${challenge.suiteId}`); // Or use CaptchaError
    }

    // 3. TODO: Implement specific interactive verification logic
    // This will likely involve:
    //    a. Retrieving the stored verificationParams for the interactive challenge ID (from req.body.interactiveChallenge.id)
    //    b. Finding the correct interactive test module using suiteData
    //    c. Calling the test module's verifyResult with the submitted interactive solution and the stored verificationParams.
    //    d. Combining the automatic and interactive results (similar to how it's done in challengeUtils.determineVerificationResult)

    // Placeholder for interactive verification result
    const verification = { 
        valid: true, // Replace with actual interactive verification logic
        message: "Interactive verification placeholder - needs implementation" 
    }; 

    console.log('Interactive verification result:', verification);
    res.json(verification);

  } catch (error) {
     console.error("Interactive verification endpoint error:", error);
     if (error.code) { // Check if it's a CaptchaError
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

