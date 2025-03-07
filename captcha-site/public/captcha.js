// This file gets included in every HTML page that needs CAPTCHA
(function() {
    // Extract token from query string
    const urlParams = new URLSearchParams(window.location.search);
    const securityToken = urlParams.get('token') || '';
    
    // Store test results
    let captchaChallenge = null;
    
    // Generate a UUID for request correlation
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

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
        
        // Let the suite handle EVERYTHING related to verification
        if (window.CaptchaSystem && window.CaptchaSystem.verify) {
          updateStatus("Starting verification process...");
          
          // Single call that handles the entire verification process
          const verificationResults = await window.CaptchaSystem.verify(challenge);
          
          // Submit results
          const verfication = await submitCaptchaResults(verificationResults, challenge);
          // Handle successful verification
          if (verfication.valid) {
            showSuccess(verfication);
          } else {
            showError("Verification failed");
          }
        } else {
          showError("Verification system failed to load.");
        }
      } catch (error) {
        showError("Verification failed. Please try again.");
      }
    }
    
    async function requestChallenge() {
      // Generate request ID to correlate this request with later submissions
      const requestId = generateUUID();
      
      // Collect environment data
      const envData = collectEnvironmentData();
      
      // Collect behavioral data
      const behaviorData = collectBehavioralData();
      
      const response = await fetch('/api/request-challenge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Security-Token': securityToken,
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          // Request metadata
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
            },
            
            // Connection information (if available)
            connection: getConnectionInfo(),
            
            // Feature detection
            features: detectFeatures()
          },
          
          // Behavioral data
          behavior: behaviorData
        })
      });
      
      // Store the request ID for later correlation
      localStorage.setItem('captchaRequestId', requestId);
      
      if (!response.ok) {
        throw new Error("Failed to get CAPTCHA challenge");
      }
      
      return await response.json();
    }
    
    function loadCaptchaSuite(suiteUrl) {
      updateStatus("Loading verification...");
      
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = suiteUrl + '?t=' + Date.now() + '&token=' + encodeURIComponent(securityToken);
        script.onload = resolve;
        script.onerror = () => {
          reject(new Error("Failed to load verification suite"));
        };
        document.head.appendChild(script);
      });
    }
    
    
    // Submit all test results back to server for verification
    async function submitCaptchaResults(verificationResults, challenge) {
      updateStatus("Completing verification...");
      
      // Get the stored request ID 
      const requestId = localStorage.getItem('captchaRequestId');
      
      // Collect current environment data
      const currentEnvData = collectEnvironmentData();
      
      // Collect full behavioral data
      const fullBehaviorData = collectBehavioralData(true);
      
      try {
        const response = await fetch('/api/verify-captcha', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Security-Token': securityToken,
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            // Challenge identification
            challengeId: challenge.id,
            initialRequestId: requestId,
            timestamp: Date.now(),
            token: securityToken,
            
            // Results from tests
            challengeSolution: {
              testResults: verificationResults.testResults,
              finalChainHash: verificationResults.finalChainHash,
              completionTime: verificationResults.completionTime,
              powResult: verificationResults.powResult
            },
            
            // Current environment data for comparison
            currentEnvironment: currentEnvData,
            
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

        const verfication = await response.json();
        return verfication;

      } catch (error) {
        console.error("Error submitting CAPTCHA results:", error);
        showError("Failed to complete verification process");
      }
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