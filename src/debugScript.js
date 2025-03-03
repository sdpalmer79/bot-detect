import express, { json, static } from 'express';
import cors from 'cors';
import { join } from 'path';
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, writeFileSync } from 'fs';
import default from './js/build-logic/build-bundles';
const { buildBundles } = default;

// Create debug server
async function startDebugServer(port = 3000) {
  console.log('Starting CAPTCHA debug server...');
  
  // Build a single bundle for testing
  console.log('Building test bundle...');
  const bundles = await buildBundles(1);
  const testBundle = bundles[0];
  console.log(`Created test bundle: ${testBundle.bundleId}`);
  
  // Get bundle paths
  const bundleDir = testBundle.path;
  const bundleJsPath = join(bundleDir, 'captcha.js');
  const bundleDataPath = join(bundleDir, 'bundle-data.json');
  
  // Read bundle data
  const bundleData = JSON.parse(readFileSync(bundleDataPath, 'utf-8'));
  
  // Setup debug directory
  const debugDir = join(__dirname, 'debug');
  if (!existsSync(debugDir)) {
    mkdirSync(debugDir, { recursive: true });
  }
  
  // Copy frontend files to debug directory
  const sourceDir = join(__dirname, '..', 'build-files');
  copyFrontendFiles(sourceDir, debugDir);
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(json());
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
    next();
  });
  
  // Serve static files from debug directory
  app.use(static(debugDir));
  
  // Serve bundle file
  app.get('/bundle/:bundleId', (req, res) => {
    if (req.params.bundleId === testBundle.bundleId) {
      res.sendFile(bundleJsPath);
    } else {
      res.status(404).send('Bundle not found');
    }
  });
  
  // API endpoint to request a challenge
  app.post('/api/request-challenge', (req, res) => {
    console.log('Challenge requested:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // Log headers for debugging
    console.log('Request headers:', req.headers);
    
    // Generate a simple challenge
    const challenge = {
      id: `challenge-${Date.now()}`,
      bundleId: testBundle.bundleId,
      bundleUrl: `/bundle/${testBundle.bundleId}`,
      timestamp: Date.now(),
      token: 'debug-token-12345',
      powDifficulty: 2,  // Reduced for faster testing
      powPrefix: 'debug',
      expiry: Date.now() + 300000 // 5 minutes
    };
    
    console.log('Sending challenge:', challenge);
    res.json(challenge);
  });
  
  // API endpoint to verify captcha results
  app.post('/api/verify-captcha', (req, res) => {
    console.log('Verification received:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // For debug server, show detailed verification process
    const verification = verifyResults(req.body, bundleData);
    
    console.log('Verification result:', verification);
    res.json(verification);
  });
  
  // Start server
  app.listen(port, () => {
    console.log(`Debug server running at http://localhost:${port}`);
    console.log(`Test bundle ID: ${testBundle.bundleId}`);
    console.log(`Debug frontend available at http://localhost:${port}/index.html`);
  });
}

// Copy frontend files to debug directory
function copyFrontendFiles(sourceDir, targetDir) {
  console.log(`Copying frontend files from ${sourceDir} to ${targetDir}`);
  
  // Create css directory if it doesn't exist
  const cssDir = join(targetDir, 'css');
  if (!existsSync(cssDir)) {
    mkdirSync(cssDir, { recursive: true });
  }
  
  // Create js directory if it doesn't exist
  const jsDir = join(targetDir, 'js');
  if (!existsSync(jsDir)) {
    mkdirSync(jsDir, { recursive: true });
  }
  
  try {
    // Copy index.html
    copyFileSync(
      join(sourceDir, 'index.html'), 
      join(targetDir, 'index.html')
    );
    console.log('Copied index.html');
    
    // Copy captcha.js
    copyFileSync(
      join(sourceDir, 'captcha.js'), 
      join(targetDir, 'js', 'captcha.js')
    );
    console.log('Copied captcha.js');
    
    // Copy CSS files if they exist
    const sourceCssDir = join(sourceDir, 'css');
    if (existsSync(sourceCssDir)) {
      readdirSync(sourceCssDir).forEach(file => {
        if (file.endsWith('.css')) {
          copyFileSync(
            join(sourceCssDir, file),
            join(cssDir, file)
          );
          console.log(`Copied css/${file}`);
        }
      });
    } else {
      console.log('No CSS directory found, creating empty captcha.css');
      // Create an empty CSS file if none exists
      writeFileSync(
        join(cssDir, 'captcha.css'),
        '/* Debug CSS file */'
      );
    }
    
    // Inject debug script into index.html
    injectDebugScript(join(targetDir, 'index.html'));
    
  } catch (error) {
    console.error('Error copying frontend files:', error);
  }
}

// Inject a debug logging script into the HTML
function injectDebugScript(htmlPath) {
  let html = readFileSync(htmlPath, 'utf8');
  
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
  
  writeFileSync(htmlPath, html);
  console.log('Injected debug panel into index.html');
}

// Basic verification logic
function verifyResults(submission, bundleData) {
  // In debug mode, we just log the verification steps
  // In real implementation, this would do proper verification
  console.log('Verifying proof of work...');
  // Simple validation of PoW - check if hash starts with zeros
  const powValid = submission.powResult && 
                 submission.powResult.hash && 
                 submission.powResult.hash.startsWith('00');
  
  console.log('Verifying test results...');
  // Check if all required tests have results
  const realTests = bundleData.realTests || [];
  const missingTests = realTests.filter(testId => 
    !submission.testResults || !submission.testResults[testId]
  );
  
  return {
    valid: powValid && missingTests.length === 0,
    powValid,
    testsComplete: missingTests.length === 0,
    missingTests: missingTests.length > 0 ? missingTests : undefined,
    debug: {
      bundleId: bundleData.bundleId,
      realTests,
      receivedTests: Object.keys(submission.testResults || {})
    }
  };
}

// When run directly
if (require.main === module) {
  const port = parseInt(process.argv[2] || '3000', 10);
  startDebugServer(port).catch(console.error);
}

export default { startDebugServer };