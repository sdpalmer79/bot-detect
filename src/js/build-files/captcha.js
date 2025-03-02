// This file gets included in every HTML page that needs CAPTCHA
(function() {
    // Extract token from query string
    const urlParams = new URLSearchParams(window.location.search);
    const securityToken = urlParams.get('token') || '';
    
    // Store test results and hashes
    let testResults = [];
    let currentChainHash = '';
    let captchaChallenge = null;
    
    async function initCaptcha() {
      try {
        // Request a challenge from server with token
        const challenge = await requestChallenge();
        captchaChallenge = challenge;
        
        // Create container for CAPTCHA UI
        createCaptchaContainer();
        
        // Load the specific bundle for this challenge
        await loadCaptchaBundle(challenge.bundleUrl);
        
        // Initialize the test execution process
        if (window.CaptchaSystem && window.CaptchaSystem.initialize) {
          // Run proof of work first to establish chain
          const powResult = await runProofOfWork(challenge);
          
          // Set initial hash from proof of work
          currentChainHash = powResult.hash;
          testResults.push({ type: 'pow', result: powResult });
          
          // Execute the bundle's tests with chained hashes
          await executeTestsSequentially(challenge);
        } else {
          console.error("CAPTCHA bundle failed to initialize properly");
          showError("Verification system failed to load. Please try again.");
        }
      } catch (error) {
        console.error("Failed to initialize CAPTCHA:", error);
        showError("Verification failed. Please refresh and try again.");
      }
    }
    
    async function requestChallenge() {
      const response = await fetch('/api/request-challenge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Security-Token': securityToken
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          token: securityToken,
          userAgent: navigator.userAgent,
          language: navigator.language
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to get CAPTCHA challenge");
      }
      
      return await response.json();
    }
    
    function loadCaptchaBundle(bundleUrl) {
      updateStatus("Loading verification...");
      
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = bundleUrl + '?t=' + Date.now() + '&token=' + encodeURIComponent(securityToken);
        script.onload = resolve;
        script.onerror = () => {
          reject(new Error("Failed to load verification bundle"));
        };
        document.head.appendChild(script);
      });
    }
    
    /**
     * Runs the proof of work algorithm to establish initial chain hash
     */
    async function findProofOfWork(difficulty, prefix, timestamp, token) {
        try {
        // Target pattern: required number of leading zeros
        const targetPattern = new RegExp(`^${'0'.repeat(difficulty)}`);
        
        // Base string includes timestamp and token
        const baseString = prefix + timestamp + token;
        
        // Start searching for a solution
        let nonce = 0;
        let hash = '';
        const startTime = performance.now();
        
        while (true) {
            // Check if we've been searching too long
            if (performance.now() - startTime > 10000) {
                // Prevent excessive computation - limit to 10 seconds
                return {
                    nonce: nonce,
                    hash: hash,
                    solved: false,
                    timeSpent: performance.now() - startTime,
                    attemptsCount: nonce,
                };
            }
            
            // Try a new nonce
            hash = await sha256(baseString + nonce);
            
            // Check if this hash meets our difficulty requirement
            if (targetPattern.test(hash)) {
                // Found a solution!
                return {
                    nonce: nonce,
                    hash: hash,
                    solved: true,
                    timeSpent: performance.now() - startTime,
                    attemptsCount: nonce
                };
            }
            nonce++;
            
            // Update progress occasionally
            if (nonce % 1000 === 0) {
                updateStatus(`Verification in progress... (${(performance.now() - startTime).toFixed(0)}ms)`);
            }
        }
        } catch (error) {
            console.error("Error in proof of work:", error);
            return {
                error: "Computation failed", 
                solved: false,
            };
        }
    }
    
    /**
     * Runs the proof of work algorithm to establish initial chain hash
     */
    async function runProofOfWork(challenge) {
        updateStatus("Starting verification process...");
        
        try {
            const { powDifficulty, powPrefix, timestamp } = challenge;
            
            // Run the proof of work calculation
            const result = await findProofOfWork(powDifficulty, powPrefix, timestamp, securityToken);
            updateStatus("Initial verification step complete...");
            return result;
            
        } catch (error) {
            console.error("Proof of work error:", error);
            throw new Error("Failed to complete initial verification step");
        }
    }
    
    /**
     * SHA-256 hash function using Web Crypto API
     */
    async function sha256(message) {
      try {
        // Convert string to buffer for hashing
        const msgBuffer = new TextEncoder().encode(message);
        // Hash the message
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        // Convert to hex string
        return Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (error) {
        // Fallback for environments without crypto.subtle
        return simpleHash(message);
      }
    }
    
    /**
     * Simple hash function for fallback when crypto API is unavailable
     */
    function simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
    
    /**
     * Executes all tests from the loaded bundle sequentially
     * Each test receives the hash of the previous test's result
     */
    async function executeTestsSequentially(challenge) {
      if (!window.CaptchaSystem || !window.CaptchaSystem.tests) {
        throw new Error("Test bundle not properly initialized");
      }
      
      updateStatus("Running security checks...");
      
      const testContext = {
        challenge: challenge,
        startTime: performance.now(),
        initialHash: currentChainHash
      };
      
      try {
        // Get the ordered list of tests to run from the bundle
        const testOrder = window.CaptchaSystem.getTestOrder();
        
        // Run each test in sequence
        for (let i = 0; i < testOrder.length; i++) {
          const testId = testOrder[i];
          const testFunction = window.CaptchaSystem.tests[testId];
          
          if (typeof testFunction !== 'function') {
            throw new Error(`Test ${testId} is not a valid function`);
          }
          
          updateStatus(`Verification step ${i+1}/${testOrder.length}`);
          
          // Execute the test with the current chain hash
          const testResult = await testFunction(testContext, { previousHash: currentChainHash });
          
          // Add result to our collection
          testResults.push({
            testId,
            result: testResult
          });
          
          // Update the chain hash
          currentChainHash = await sha256(JSON.stringify(testResult) + currentChainHash);
        }
        
        // All tests completed, submit results
        await submitCaptchaResults();
        
      } catch (error) {
        console.error("Error executing tests:", error);
        showError("Verification process failed. Please try again.");
      }
    }
    
    /**
     * Submit all test results back to server for verification
     */
    async function submitCaptchaResults() {
      updateStatus("Completing verification...");
      
      try {
        const response = await fetch('/api/verify-captcha', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Security-Token': securityToken
          },
          body: JSON.stringify({
            challengeId: captchaChallenge.id,
            challengeSolution: {
              testResults: testResults,
              finalChainHash: currentChainHash,
              completionTime: performance.now() - testResults[0].result.timeSpent,
              powResult: testResults[0].result
            },
            timestamp: Date.now(),
            token: securityToken
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.reason || "Verification failed");
        }
        
        const result = await response.json();
        if (result.success) {
          showSuccess(result);
        } else {
          showError("Verification failed: " + (result.reason || "Unknown error"));
        }
      } catch (error) {
        console.error("Error submitting CAPTCHA results:", error);
        showError("Failed to complete verification process");
      }
    }
    
    /**
     * Create the CAPTCHA UI container
     */
    function createCaptchaContainer() {
      // Create or find the container
      let container = document.getElementById('captcha-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'captcha-container';
        document.body.appendChild(container);
      }
      
      // Style the container
      container.style.position = 'relative';
      container.style.minHeight = '150px';
      container.style.padding = '20px';
      container.style.border = '1px solid #ddd';
      container.style.borderRadius = '5px';
      container.style.background = '#f9f9f9';
      container.style.margin = '10px 0';
      
      // Add status element
      const statusDiv = document.createElement('div');
      statusDiv.id = 'captcha-status';
      statusDiv.style.textAlign = 'center';
      statusDiv.style.padding = '10px';
      statusDiv.innerText = 'Initializing verification...';
      container.appendChild(statusDiv);
    }
    
    /**
     * Update status message in the CAPTCHA container
     */
    function updateStatus(message) {
      const statusElement = document.getElementById('captcha-status');
      if (statusElement) {
        statusElement.innerText = message;
      }
    }
    
    /**
     * Show success message and handle redirection
     */
    function showSuccess(result) {
      const container = document.getElementById('captcha-container');
      if (container) {
        container.style.border = '1px solid #4CAF50';
        container.style.background = '#E8F5E9';
        
        container.innerHTML = `
          <div style="text-align:center; color:#2E7D32; padding:20px;">
            <span style="font-size:36px;">✓</span>
            <h3>Verification Successful</h3>
            <p>Redirecting...</p>
          </div>
        `;
        
        // If there's a redirect URL, use it
        if (result.redirectUrl) {
          setTimeout(() => {
            window.location.href = result.redirectUrl + 
              (result.redirectUrl.includes('?') ? '&' : '?') + 
              'token=' + encodeURIComponent(result.token);
          }, 1500);
        }
      }
    }
    
    /**
     * Show error message
     */
    function showError(message) {
      const container = document.getElementById('captcha-container');
      if (container) {
        container.style.border = '1px solid #F44336';
        container.style.background = '#FFEBEE';
        
        container.innerHTML = `
          <div style="text-align:center; color:#C62828; padding:20px;">
            <span style="font-size:36px;">✗</span>
            <h3>Verification Failed</h3>
            <p>${message}</p>
            <button id="captcha-retry" style="padding:8px 16px; margin-top:10px;">
              Try Again
            </button>
          </div>
        `;
        
        // Add event listener to retry button
        document.getElementById('captcha-retry').addEventListener('click', () => {
          // Reload the page to start over
          window.location.reload();
        });
      }
    }
    
    // Start with slight delay and randomization
    setTimeout(initCaptcha, Math.floor(Math.random() * 50));
  })();