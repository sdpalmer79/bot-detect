const cors = require('cors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { buildSuites } = require('./build-test-suite/src/build');
const { createChallengeForRequest, verifySubmission, createInteractiveChallenge } = require('./challengeUtils');

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
  const suiteJsPath = path.join(suiteDir, 'test-suite.js');
  const suiteDataPath = path.join(suiteDir, 'suite-data.json');
  
  // Read suite data
  const suiteData = JSON.parse(fs.readFileSync(suiteDataPath, 'utf-8'));
  const challenge = createChallengeForRequest(suiteData);
  
  // Setup debug directory
  const debugDir = path.join(__dirname, 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
  // Create captcha-modules directory for interactive challenges
  const modulesDir = path.join(debugDir, 'captcha-modules');
  if (!fs.existsSync(modulesDir)) {
    fs.mkdirSync(modulesDir, { recursive: true });
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
    const verification = await verifySubmission(req.body, challenge, suiteData);
    
    console.log('Verification result:', verification);
    
    // If interactive verification is required, generate pattern completion challenge
    if (verification.requiresInteractiveChallenge) {
      console.log('Interactive challenge required, generating challenge');
      
      // Create client-side pattern completion module
      createDebugPatternCompletionModule(modulesDir);
    }
    
    res.json(verification);
  });
  
  // API endpoint to verify interactive captcha results
  app.post('/api/verify-interactive-captcha', async (req, res) => {
    console.log('Interactive verification received:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // Get both automatic and interactive challenge results
    const { challengeSolution, interactiveChallenge } = req.body;
    
    // First verify the automatic tests
    const autoVerification = await verifySubmission(req.body, challenge, suiteData);
    
    // Update verification with interactive challenge results
    if (interactiveChallenge) {
      // In a real implementation, this would analyze the interaction patterns
      // For debug, simply check if the challenge was successful
      const interactiveSuccess = interactiveChallenge.success === true;
      
      // Override verification result based on interactive challenge
      autoVerification.valid = interactiveSuccess;
      autoVerification.requiresInteractiveChallenge = false;
      autoVerification.interactiveVerified = true;
      
      // Add interactive challenge details
      autoVerification.details = autoVerification.details || {};
      autoVerification.details.interactiveChallenge = {
        success: interactiveSuccess,
        type: interactiveChallenge.challengeType || 'pattern_completion',
        completionTime: interactiveChallenge.completionTime,
        interactionCount: (interactiveChallenge.userInteractions || []).length
      };
    }
    
    console.log('Interactive verification result:', autoVerification);
    
    res.json(autoVerification);
  });
  
  // Start server
  app.listen(port, () => {
    console.log(`Debug server running at http://localhost:${port}`);
    console.log(`Test suite ID: ${testSuite.suiteId}`);
    console.log(`Debug frontend available at http://localhost:${port}/index.html`);
  });
}

// Create debug pattern completion module
function createDebugPatternCompletionModule(modulesDir) {
  const moduleCode = `// Pattern Completion Challenge module
// This is a debugging implementation for the pattern completion challenge

// Initialize global object for interactive challenges
window.InteractiveCaptcha = window.InteractiveCaptcha || {};

// Implementation for pattern completion challenge
window.InteractiveCaptcha.pattern_completion = async function(container, parameters) {
  console.log('Starting pattern completion challenge with parameters:', parameters);
  
  // Generate a deterministic challenge based on parameters
  const difficulty = parameters.difficulty || 5;
  const challengeId = parameters.challenge?.id || Math.random().toString(36).substring(7);
  const timestamp = parameters.challenge?.timestamp || Date.now();
  
  // Record start time for interaction measurement
  const startTime = performance.now();
  
  // Track user interactions
  const userInteractions = [];
  function recordInteraction(type, data) {
    userInteractions.push({
      type: type,
      timestamp: performance.now(),
      data: data
    });
  }
  
  // Add mousemove listener to container
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    recordInteraction('mousemove', {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  });
  
  // Create title and instructions
  const titleElement = document.createElement('h3');
  titleElement.textContent = 'Visual Challenge';
  titleElement.style.textAlign = 'center';
  titleElement.style.marginBottom = '10px';
  container.appendChild(titleElement);
  
  const instructions = document.createElement('p');
  instructions.textContent = 'Select the pattern piece that completes the image';
  instructions.style.textAlign = 'center';
  instructions.style.marginBottom = '15px';
  container.appendChild(instructions);
  
  // Create main image container
  const imageContainer = document.createElement('div');
  imageContainer.style.width = '250px';
  imageContainer.style.height = '150px';
  imageContainer.style.backgroundColor = '#f0f0f0';
  imageContainer.style.margin = '0 auto';
  imageContainer.style.position = 'relative';
  imageContainer.style.border = '1px solid #ccc';
  
  // Create "missing" section
  const missingSection = document.createElement('div');
  missingSection.style.position = 'absolute';
  missingSection.style.width = '50px';
  missingSection.style.height = '50px';
  missingSection.style.backgroundColor = 'white';
  missingSection.style.border = '1px dashed #999';
  
  // Position missing section based on difficulty
  const missingLeft = 100 + (difficulty * 5) % 100;
  const missingTop = 50 + (difficulty * 3) % 50;
  missingSection.style.left = missingLeft + 'px';
  missingSection.style.top = missingTop + 'px';
  
  // Add pattern to main image
  for (let i = 0; i < 8; i++) {
    const pattern = document.createElement('div');
    pattern.style.position = 'absolute';
    pattern.style.width = '30px';
    pattern.style.height = '30px';
    pattern.style.borderRadius = '50%';
    pattern.style.backgroundColor = getPatternColor(i, difficulty);
    pattern.style.left = (i * 30) % 220 + 'px';
    pattern.style.top = (i * 25) % 120 + 'px';
    pattern.style.opacity = '0.7';
    
    // Don't add patterns that overlap with missing section
    const patternLeft = (i * 30) % 220;
    const patternTop = (i * 25) % 120;
    if (!(patternLeft + 30 > missingLeft && patternLeft < missingLeft + 50 &&
          patternTop + 30 > missingTop && patternTop < missingTop + 50)) {
      imageContainer.appendChild(pattern);
    }
  }
  
  imageContainer.appendChild(missingSection);
  container.appendChild(imageContainer);
  
  // Create options container
  const optionsContainer = document.createElement('div');
  optionsContainer.style.display = 'flex';
  optionsContainer.style.justifyContent = 'space-around';
  optionsContainer.style.marginTop = '20px';
  container.appendChild(optionsContainer);
  
  // Generate options (one correct, others incorrect)
  const optionCount = 3 + Math.min(Math.floor(difficulty / 3), 3); // 3-6 options based on difficulty
  const correctOptionIndex = Math.floor(Math.random() * optionCount);
  
  // Create option elements
  const optionElements = [];
  for (let i = 0; i < optionCount; i++) {
    const option = document.createElement('div');
    option.style.width = '60px';
    option.style.height = '60px';
    option.style.backgroundColor = '#f0f0f0';
    option.style.border = '2px solid #ccc';
    option.style.borderRadius = '5px';
    option.style.cursor = 'pointer';
    option.style.position = 'relative';
    
    // The correct option has patterns matching the main image
    if (i === correctOptionIndex) {
      // Add matching patterns
      for (let j = 0; j < 3; j++) {
        const pattern = document.createElement('div');
        pattern.style.position = 'absolute';
        pattern.style.width = '20px';
        pattern.style.height = '20px';
        pattern.style.borderRadius = '50%';
        pattern.style.backgroundColor = getPatternColor(j + 3, difficulty);
        pattern.style.left = (j * 15) % 40 + 'px';
        pattern.style.top = (j * 15) % 40 + 'px';
        pattern.style.opacity = '0.7';
        option.appendChild(pattern);
      }
    } else {
      // Incorrect options have different patterns
      for (let j = 0; j < 3; j++) {
        const pattern = document.createElement('div');
        pattern.style.position = 'absolute';
        pattern.style.width = '15px';
        pattern.style.height = '15px';
        
        // Make incorrect options different shapes or colors
        if ((i + j) % 3 === 0) {
          pattern.style.borderRadius = '0'; // Square shape
        } else {
          pattern.style.borderRadius = '50%'; // Circle shape
        }
        
        pattern.style.backgroundColor = getPatternColor(i + j + 10, difficulty);
        pattern.style.left = (j * 20) % 40 + 'px';
        pattern.style.top = (j * 20) % 40 + 'px';
        pattern.style.opacity = '0.7';
        option.appendChild(pattern);
      }
    }
    
    optionsContainer.appendChild(option);
    optionElements.push(option);
    
    // Add click event
    option.addEventListener('click', () => {
      recordInteraction('selection', {
        optionIndex: i,
        isCorrect: i === correctOptionIndex
      });
      
      // Highlight selected option
      optionElements.forEach((el, idx) => {
        el.style.border = idx === i ? '2px solid #4CAF50' : '2px solid #ccc';
      });
      
      // Show result message
      const resultMessage = document.createElement('div');
      resultMessage.style.textAlign = 'center';
      resultMessage.style.padding = '10px';
      resultMessage.style.marginTop = '15px';
      resultMessage.style.fontWeight = 'bold';
      
      if (i === correctOptionIndex) {
        resultMessage.textContent = 'Correct!';
        resultMessage.style.color = '#4CAF50';
      } else {
        resultMessage.textContent = 'Incorrect. Please try again.';
        resultMessage.style.color = '#F44336';
        
        // Allow another selection after delay
        setTimeout(() => {
          resultMessage.remove();
          optionElements.forEach(el => {
            el.style.border = '2px solid #ccc';
          });
        }, 1500);
        return;
      }
      
      container.appendChild(resultMessage);
      
      // Calculate completion time
      const completionTime = performance.now() - startTime;
      
      // After a short delay, return the result
      setTimeout(() => {
        const result = {
          success: i === correctOptionIndex,
          challengeType: 'pattern_completion',
          difficulty: difficulty,
          completionTime: completionTime,
          userInteractions: userInteractions,
          data: {
            selectedOptionIndex: i,
            correctOptionIndex: correctOptionIndex
          }
        };
        
        // Resolve with the result
        window.captchaInteractiveResult = result;
        
        // Dispatch event to notify that the challenge is complete
        const event = new CustomEvent('captchaInteractiveComplete', { detail: result });
        window.dispatchEvent(event);
      }, 1000);
    });
  }
  
  // Return a promise that resolves when user completes the challenge
  return new Promise((resolve) => {
    window.addEventListener('captchaInteractiveComplete', (e) => {
      resolve(e.detail);
    }, { once: true });
  });
};

// Helper function to generate pattern colors
function getPatternColor(index, difficulty) {
  const colors = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
    '#9b59b6', '#1abc9c', '#d35400', '#34495e'
  ];
  
  // Deterministic color selection based on index and difficulty
  const colorIndex = (index + difficulty) % colors.length;
  return colors[colorIndex];
}
`;

  // Write the module to the filesystem
  fs.writeFileSync(path.join(modulesDir, 'pattern_completion.js'), moduleCode);
  console.log('Created debug pattern completion module');
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

