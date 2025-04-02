// This file gets included in every HTML page that needs CAPTCHA
(function() {
    // Extract token from query string
    const urlParams = new URLSearchParams(window.location.search);
    const securityToken = urlParams.get('x-challenge-id') || '';

    // Collect environment data
    function collectEnvironmentData() {
      return {
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
        
        // Window properties
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      };
    }

    // Get connection information if available
    function getConnectionInfo() {
      if (!navigator.connection) return null;
      
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }

    // Detect browser features
    function detectFeatures() {
      return {
        webGL: !!window.WebGLRenderingContext,
        canvas: !!window.CanvasRenderingContext2D,
        webAudio: !!window.AudioContext || !!window.webkitAudioContext,
        touchEvents: 'ontouchstart' in window,
        webRTC: !!window.RTCPeerConnection
      };
    }

    // Behavioral data collection
    function collectBehavioralData(detailed = false) {
      // Basic data always collected
      const data = {
        pageLoadTime: performance.now(),
        userInteractionCount: window._userInteractions || 0,
        formInteractions: window._formInteractions || 0
      };
      
      // Detailed data for final submission
      if (detailed) {
        data.mouseMovements = window._mouseMovements || 0;
        data.keyPresses = window._keyPresses || 0;
        data.scrollEvents = window._scrollEvents || 0;
        data.timeOnPage = performance.now();
        data.focusBlurEvents = window._focusEvents || 0;
      }
      
      return data;
    }

    // Get performance timing data
    function getNavigationTiming() {
      if (!performance || !performance.timing) return {};
      
      const timing = performance.timing;
      return {
        navigationStart: timing.navigationStart,
        domComplete: timing.domComplete,
        loadEventEnd: timing.loadEventEnd,
        domainLookupEnd: timing.domainLookupEnd - timing.domainLookupStart,
        connectEnd: timing.connectEnd - timing.connectStart,
        responseEnd: timing.responseEnd - timing.responseStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
      };
    }

    // Get resource timing information
    function getResourceTiming() {
      if (!performance || !performance.getEntriesByType) return [];
      
      // Get timing for script resources
      return performance.getEntriesByType('resource')
        .filter(resource => resource.initiatorType === 'script')
        .map(resource => ({
          name: resource.name.split('/').pop(),
          duration: resource.duration,
          size: resource.transferSize || 0
        }));
    }

    // Get memory info if available
    function getMemoryInfo() {
      if (!performance || !performance.memory) return {};
      
      return {
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory?.totalJSHeapSize,
        usedJSHeapSize: performance.memory?.usedJSHeapSize
      };
    }

    async function initCaptcha() {
      try {
        // Request challenge from server
        const challenge = await requestChallenge();
        
        // Create UI container
        createCaptchaContainer();
        
        // Load the suite
        await loadCaptchaSuite(challenge.suiteUrl);
        
        // Check if CaptchaSystem was defined by the loaded script
        if (!window.CaptchaSystem || !window.CaptchaSystem.startInteractiveVerify) {
          console.error("CaptchaSystem not found or verify method not available");
          showError("Verification system failed to load properly.");
          return;
        }
        
        // Let the suite handle verification tests
        updateStatus("Starting verification process...");
        
        try {
          // Run verification tests - this doesn't make the API call yet
          const autoResults = await window.CaptchaSystem.startAutoVerify(challenge);
          console.log("Verification results:", autoResults);
          
          // Check if we got valid results back
          if (!autoResults || autoResults.error) {
            console.error("Verification failed:", autoResults?.error || "Unknown error");
            showError("Verification tests failed to complete.");
            return;
          }
          
          // Now explicitly submit results to the server
          updateStatus("Submitting verification results...");
          const verification = await submitAutoResults(autoResults, challenge);
          
          // Check if interactive challenge is required
          if (verification.requiresInteractiveChallenge && verification.interactiveChallenge) {
            // Handle interactive challenge
            updateStatus("Additional verification required...");
            const { interactiveChallenge } = verification;
            const interactiveResult = await window.CaptchaSystem.startInteractiveVerify(interactiveChallenge);
            
            // Submit interactive challenge results
            const finalVerification = await submitInteractiveResults(
              interactiveResult
            );
            
            // Handle final verification result
            if (finalVerification.valid) {
              showSuccess(finalVerification);
            } else {
              showError("Verification failed after interactive challenge");
            }
          } else if (verification.valid) {
            // Handle successful verification (no interactive challenge needed)
            showSuccess(verification);
          } else {
            showError("Verification failed");
          }
        } catch (error) {
          console.error("Error during verification process:", error);
          showError("Verification process encountered an error.");
        }
      } catch (error) {
        console.error("CAPTCHA initialization failed:", error);
        showError("Verification failed. Please try again.");
      }
    }
    
    async function requestChallenge() {
      
      // Collect essential data for initial fingerprinting
      const envData = collectEnvironmentData();
      const connectionData = getConnectionInfo();
      const featuresData = detectFeatures();
      const behaviorData = collectBehavioralData(false);
      
      try {
        console.log("Requesting challenge from server...");
        const response = await fetch('/api/request-challenge', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-challenge-id': securityToken
          },
          body: JSON.stringify({
            timestamp: Date.now(),
            pageUrl: window.location.href,
            referrer: document.referrer,
            
            // Core fingerprinting data
            environment: {
              ...envData,
              // Add time zone info
              timeZone: {
                offset: new Date().getTimezoneOffset(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              },
              // Add network and features data
              connection: connectionData,
              features: featuresData
            },
            
            // Basic behavior data
            behavior: behaviorData
          })
        });
        
        if (!response.ok) {
          throw new Error("Failed to get CAPTCHA challenge");
        }
        
        const challenge = await response.json();
        console.log("Received challenge:", challenge);
        return challenge;
      } catch (error) {
        console.error("Error requesting challenge:", error);
        throw error;
      }
    }
    
    // Submit all test results back to server for verification
    async function submitAutoResults(autoResults) {
      updateStatus("Completing verification...");
      
      // Collect current environment data
      const currentEnvData = collectEnvironmentData();
      
      // Collect full behavioral data
      const fullBehaviorData = collectBehavioralData(true);
      
      try {
        console.log("Submitting verification results to /api/verify-captcha");
        const response = await fetch('/api/verify-captcha', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-challenge-id': securityToken
          },
          body: JSON.stringify({
            timestamp: Date.now(),
            
            // Results from tests
            autoResults,
            
            // Standardized field name (was "currentEnvironment")
            environment: {
              // Environment data
              ...currentEnvData,
              
              // Time & location info
              timeZone: {
                offset: new Date().getTimezoneOffset(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              },
              
              // Connection information (if available)
              connection: getConnectionInfo(),
              
              // Feature detection
              features: detectFeatures()
            },
            
            // Behavioral data
            behavior: fullBehaviorData,
            
            // Performance data
            performance: {
              navigationTiming: getNavigationTiming(),
              resourceTiming: getResourceTiming(),
              memoryInfo: getMemoryInfo()
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const verification = await response.json();
        console.log("Server verification response:", verification);
        return verification;
      } catch (error) {
        console.error("Error submitting CAPTCHA results:", error);
        showError("Failed to complete verification process");
        return { valid: false, error: error.message };
      }
    }
    
    // Submit interactive challenge results
    async function submitInteractiveResults(interactiveResult) {
      updateStatus("Submitting interactive verification..."); 
      
      // Collect current environment data
      const currentEnvData = collectEnvironmentData();
      
      // Collect full behavioral data
      const fullBehaviorData = collectBehavioralData(true);
      
      try {
        console.log("Submitting interactive challenge results to /api/verify-interactive-captcha");
        const response = await fetch('/api/verify-interactive-captcha', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-challenge-id': securityToken
          },
          body: JSON.stringify({
            // Challenge identification
            challengeId: challenge.id,
            timestamp: Date.now(),   
            
            // Results from interactive challenge
            interactiveResult,
            
            // Environment data
            environment: {
              ...currentEnvData,
              
              // Time & location info
              timeZone: {
                offset: new Date().getTimezoneOffset(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              },
              
              // Connection information (if available)
              connection: getConnectionInfo(),
              
              // Feature detection
              features: detectFeatures()
            },
            
            // Behavioral data
            behavior: fullBehaviorData,
            
            // Performance data
            performance: {
              navigationTiming: getNavigationTiming(),
              resourceTiming: getResourceTiming(),
              memoryInfo: getMemoryInfo()
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const verification = await response.json();
        console.log("Interactive verification response:", verification);
        return verification;
      } catch (error) {
        console.error("Error submitting interactive CAPTCHA results:", error);
        showError("Failed to complete interactive verification process");
        return { valid: false, error: error.message };
      }
    }

    // Load the CAPTCHA suite script
    function loadCaptchaSuite(suiteUrl) {
      updateStatus("Loading verification...");
      return new Promise(async (resolve, reject) => {
        console.log(`Loading CAPTCHA suite from ${suiteUrl} using fetch with custom headers...`);
        try {
          const response = await fetch(suiteUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/javascript',
              'x-challenge-id': securityToken
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to load suite: ${response.status} ${response.statusText}`);
          }
          
          const scriptText = await response.text();
          
          // Inject the downloaded script into the document
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.textContent = scriptText;
          document.head.appendChild(script);
          
          // Verify if the script executed properly by checking for CaptchaSystem
          if (!window.CaptchaSystem) {
            console.error('CaptchaSystem not defined after executing suite script');
            reject(new Error('Failed to initialize verification system'));
          } else {
            console.log('CAPTCHA suite loaded and executed successfully.');
            resolve();
          }
        } catch (error) {
          console.error('Error loading or executing CAPTCHA suite:', error);
          reject(new Error("Failed to load or execute verification suite"));
        }
      });
    }
    
    // Create the CAPTCHA UI container
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
      
      // Add graphic container for visual challenges
      const graphicDiv = document.createElement('div');
      graphicDiv.id = 'captcha-graphic';
      graphicDiv.style.display = 'none';
      graphicDiv.style.position = 'relative';
      graphicDiv.style.minHeight = '200px'; 
      graphicDiv.style.margin = '20px 0';
      graphicDiv.style.border = '1px solid #eee';
      graphicDiv.style.borderRadius = '5px';
      container.appendChild(graphicDiv);
    }
    
    // Update status message in the CAPTCHA container
    function updateStatus(message) {
      const statusElement = document.getElementById('captcha-status');
      if (statusElement) {
        statusElement.innerText = message;
      }
    }
    
    // Show success message and handle redirection
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
              'token=' + encodeURIComponent(securityToken);
          }, 1500);
        }
      }
    }
    
    // Show error message
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