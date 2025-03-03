
// Automatically generated CAPTCHA bundle
// Bundle ID: 97a97bbd2ffe822ea916c66dc431748a
// Generated: 2025-03-03T20:23:10.560Z

// Test implementation
const testImplementations = {
  "test_0d4eec3b": 
        function run_test_0d4eec3b(ctx, params) {
          // Use previous hash to modify loop behavior
          const hashSeed = parseInt(params.previousHash.substring(0, 8), 16);
          
          // Create unique loop count based on previous test's hash
          const baseLoopCount = 1000000;
          const loopFactor = 10000;
          const loopCount = baseLoopCount + (hashSeed % loopFactor);
          
          // Embedded timing measurement utility
          function measureOperation(operation, iterations) {
            const start = performance.now();
            let result = 0;
            
            for (let i = 0; i < iterations; i++) {
              // Use a function that's hard to optimize away
              result += operation(i, result);
            }
            
            const end = performance.now();
            return {
              duration: end - start,
              operationsPerMs: iterations / (end - start),
              iterations,
              result
            };
          }
          
          // Create custom math operation unique to this test instance
          function customMathOperation(i, prevResult) {
            return Math.tan(i * 0.01) / (1 + Math.abs(prevResult * 0.01));
          }
          
          // Perform the timing test
          const result = measureOperation(customMathOperation, loopCount);
          
          // Add context information
          result.loopCount = loopCount;
          result.deviceMemory = navigator.deviceMemory;
          result.hardwareConcurrency = navigator.hardwareConcurrency;
          result.previousHashFragment = params.previousHash.substring(0, 8);
          
          return result;
        }
      ,

  "test_dcb0cda1": 
        function run_test_dcb0cda1(ctx, params) {
          // Embedded helper function for calculating hash
          function calculateHash(input) {
            let str = typeof input === 'string' ? input : JSON.stringify(input);
            let hash = 21780; // Random initial seed
            
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = (hash + char) * 747796405 + 2891336453;
            }
            
            return Math.abs(hash).toString(16).padStart(8, '0');
          }
          
          // Main test logic
          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
              return { 
                supported: false,
                previousHash: params.previousHash.substring(0, 8)
              };
            }
            
            // Get supported extensions
            const extensions = gl.getSupportedExtensions();
            
            // Get max precision
            const highPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
            const mediumPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
            const lowPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT);
            
            // Get max parameters
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
            const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
            
            // Compile results
            const result = {
              extensionCount: extensions.length,
              extensionHash: calculateHash(extensions.slice(0, 10).join()),
              maxTextureSize,
              maxRenderbufferSize,
              highPrecisionRange: [highPrecision.rangeMin, highPrecision.rangeMax],
              mediumPrecisionRange: [mediumPrecision.rangeMin, mediumPrecision.rangeMax],
              lowPrecisionRange: [lowPrecision.rangeMin, lowPrecision.rangeMax],
              renderer: gl.getParameter(gl.RENDERER),
              vendor: gl.getParameter(gl.VENDOR),
              previousHashFragment: params.previousHash.substring(0, 8)
            };
            
            // Add extension-specific tests
            if (extensions.includes('WEBGL_debug_renderer_info')) {
              const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
              if (debugExt) {
                result.unmaskedVendor = gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL);
                result.unmaskedRenderer = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL);
              }
            }
            
            // Calculate final result hash that incorporates previous hash
            result.resultHash = calculateHash(params.previousHash + JSON.stringify(result));
            
            return result;
          } catch (error) {
            return { 
              error: 'WebGL test failed', 
              previousHash: params.previousHash.substring(0, 8)
            };
          }
        }
      ,

  "test_4696e53a": 
        function run_test_4696e53a(ctx, params) {
          // Embed renderWebGLTest implementation directly
          function renderWebGLTest(gl, parameters) {
            const {width, height, seed} = parameters;
            
            // Set canvas to specified dimensions
            gl.canvas.width = width;
            gl.canvas.height = height;
            
            // Create shader program using seed to vary behavior
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, `
              attribute vec4 a_position;
              void main() {
                gl_Position = a_position;
              }
            `);
            gl.compileShader(vertexShader);
            
            // Move this shader source code inside the function where width and height are defined
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            const fragmentShaderSource = `
              precision mediump float;
              uniform float u_seed;
              
              float random(vec2 co) {
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
              }
              
              void main() {
                vec2 uv = gl_FragCoord.xy / vec2(${width}.0, ${height}.0);
                float r = random(uv * u_seed);
                float g = random(uv * u_seed + 1.0);
                float b = random(uv * u_seed + 2.0);
                gl_FragColor = vec4(r, g, b, 1.0);
              }
            `;
            gl.shaderSource(fragmentShader, fragmentShaderSource);
            gl.compileShader(fragmentShader);
            
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            gl.useProgram(program);
            
            // Set seed uniform
            const seedLocation = gl.getUniformLocation(program, "u_seed");
            gl.uniform1f(seedLocation, parseFloat(seed) / 10000.0);
            
            // Create a buffer with a square (2 triangles)
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
              -1.0, -1.0,
               1.0, -1.0,
              -1.0,  1.0,
              -1.0,  1.0,
               1.0, -1.0,
               1.0,  1.0
            ]), gl.STATIC_DRAW);
            
            // Set up attribute
            const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
            
            // Draw the scene
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            // Read pixel data
            const pixels = new Uint8Array(width * height * 4);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            
            return pixels;
          }
          
          // Embed hashPixelData implementation directly
          function hashPixelData(pixels) {
            if (!pixels || !pixels.length) return "no_pixels";
            
            // Only sample a subset of pixels for efficiency
            const stride = Math.max(1, Math.floor(pixels.length / 1000));
            const samples = [];
            
            for (let i = 0; i < pixels.length; i += stride * 4) {
              // Take RGBA values and combine them
              if (i + 3 < pixels.length) {
                samples.push(
                  (pixels[i] << 24) | 
                  (pixels[i+1] << 16) | 
                  (pixels[i+2] << 8) | 
                  pixels[i+3]
                );
              }
            }
            
            // Custom hash function with varied implementation
            let hash = 45023; // Random initial value
            for (let i = 0; i < samples.length; i++) {
              // Different hashing algorithms based on template instance
              hash = (hash * 31 + samples[i]) & 0xFFFFFFFF;
            }
            
            return Math.abs(hash).toString(16).padStart(8, '0');
          }
          
          // Main test function body
          const gl = document.createElement('canvas').getContext('webgl');
          if (!gl) return { supported: false };
          
          // Use basic rendering with standard parameters
          const result = renderWebGLTest(gl, {
            width: 1024,
            height: 256,
            seed: 46915 + params.previousHash.substring(0, 8)
          });
          
          return {
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            result: hashPixelData(result),
            previousHashFragment: params.previousHash.substring(0, 8)
          };
        }
      ,

  "test_1fb0bddb": 
        function run_test_1fb0bddb(ctx, params) {
          // Embedded feature detection helper
          function detectBrowserFeatures() {
            const features = {};
            
            // Screen properties
            features.screen = {
              width: window.screen.width,
              height: window.screen.height,
              availWidth: window.screen.availWidth,
              availHeight: window.screen.availHeight,
              colorDepth: window.screen.colorDepth,
              pixelDepth: window.screen.pixelDepth
            };
            
            // Navigator properties
            features.navigator = {
              userAgent: navigator.userAgent,
              language: navigator.language,
              languages: navigator.languages,
              platform: navigator.platform,
              doNotTrack: navigator.doNotTrack,
              hardwareConcurrency: navigator.hardwareConcurrency,
              deviceMemory: navigator.deviceMemory,
              maxTouchPoints: navigator.maxTouchPoints
            };
            
            // Feature detection
            features.features = {
              canvas: !!window.HTMLCanvasElement,
              webgl: !!window.WebGLRenderingContext,
              webgl2: !!window.WebGL2RenderingContext,
              webrtc: !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection),
              pdfReader: !!navigator.pdfViewerEnabled,
              audio: !!window.AudioContext,
              video: !!document.createElement('video').canPlayType,
              battery: !!navigator.getBattery,
              speechSynthesis: !!window.speechSynthesis,
              bluetooth: !!navigator.bluetooth
            };
            
            // Timezone
            features.timezone = {
              offset: new Date().getTimezoneOffset(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            
            return features;
          }
          
          // Embedded hash function
          function hashObject(obj, prevHash) {
            const str = JSON.stringify(obj) + prevHash;
            let hash = 758206;
            
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 7) ^ char) * 7;
            }
            
            return Math.abs(hash).toString(16).padStart(8, '0');
          }
          
          // Main test logic
          const browserFeatures = detectBrowserFeatures();
          
          // Check for inconsistencies that might indicate spoofing
          const inconsistencies = [];
          
          // Example: Check if platform matches userAgent
          const ua = navigator.userAgent.toLowerCase();
          const platform = navigator.platform.toLowerCase();
          
          if (ua.includes('windows') && !platform.includes('win')) {
            inconsistencies.push('platform_ua_mismatch');
          }
          
          if (ua.includes('mac') && !platform.includes('mac')) {
            inconsistencies.push('platform_ua_mismatch');
          }
          
          if (ua.includes('linux') && !platform.includes('linux')) {
            inconsistencies.push('platform_ua_mismatch');
          }
          
          // Final result with fingerprint hash incorporating previous hash
          return {
            fingerprint: hashObject(browserFeatures, params.previousHash),
            inconsistencies,
            features: browserFeatures,
            previousHashFragment: params.previousHash.substring(0, 8)
          };
        }
      
};

// Proof of Work implementation
async function runProofOfWork(challenge) {
  try {
    // Get parameters from the challenge
    const difficulty = challenge.powDifficulty || 4;
    const prefix = challenge.powPrefix || "";
    const timestamp = challenge.timestamp;
    const token = challenge.token;
    
    // Target pattern: required number of leading zeros
    const targetPattern = new RegExp(`^${'0'.repeat(difficulty)}`);
    
    // Base string includes only timestamp and token
    // This allows the server to easily verify the proof of work
    const baseString = prefix + timestamp + token;
    
    // Start searching for a solution
    let nonce = 0;
    let hash = '';
    const startTime = performance.now();
    
    // Keep trying different nonce values until we find one that works
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
          timestamp: timestamp
        };
      }
      
      // Simple SHA-256 hashing
      hash = await sha256(baseString + nonce);
      
      // Check if this hash meets our difficulty requirement
      if (targetPattern.test(hash)) {
        // Found a solution!
        return {
          nonce: nonce,
          hash: hash,
          solved: true,
          timeSpent: performance.now() - startTime,
          attemptsCount: nonce,
          timestamp: timestamp
        };
      }
      
      nonce++;
      
      // Update progress occasionally
      if (nonce % 1000 === 0) {
        console.log(`Proof of work in progress... (${nonce} attempts)`);
      }
    }
  } catch (error) {
    console.error("Error in proof of work:", error);
    return {
      error: "Computation failed", 
      solved: false,
      timestamp: challenge.timestamp
    };
  }
}

// Implementation of SHA-256 for hashing
async function sha256(message) {
  // Use SubtleCrypto if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Pure JS implementation of SHA-256 algorithm
  // This is a complete implementation matching the standard
  
  // Convert string to array of bytes
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : {
    encode: (str) => {
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xff;
      }
      return bytes;
    }
  };
  
  const bytes = encoder.encode(message);
  
  // SHA-256 constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  // Initial hash values (first 32 bits of the fractional parts of the square roots of the first 8 primes)
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  // Pre-processing: padding the message
  const bitLength = bytes.length * 8;
  const paddingLength = (512 - ((bitLength + 8 + 64) % 512)) % 512;
  
  // Create padded message (original + 1 + zeros + length as 64-bit BE integer)
  const paddedLength = Math.ceil((bitLength + 8 + paddingLength + 64) / 8);
  const padded = new Uint8Array(paddedLength);
  
  // Copy original message
  padded.set(bytes);
  
  // Append 1 followed by zeros
  padded[bytes.length] = 0x80;
  
  // Append 64-bit BE integer for original length
  const lengthBytes = new Uint8Array(8);
  let tempLength = bitLength;
  for (let i = 7; i >= 0; i--) {
    lengthBytes[i] = tempLength & 0xff;
    tempLength = tempLength >>> 8;
  }
  padded.set(lengthBytes, paddedLength - 8);
  
  // Process the message in 512-bit chunks
  for (let i = 0; i < padded.length; i += 64) {
    const chunk = padded.slice(i, i + 64);
    
    // Create message schedule array (64x 32-bit words)
    const W = new Array(64).fill(0);
    
    // Copy chunk into first 16 words of the message schedule array
    for (let j = 0; j < 16; j++) {
      W[j] = (chunk[j*4] << 24) | (chunk[j*4+1] << 16) | (chunk[j*4+2] << 8) | chunk[j*4+3];
    }
    
    // Extend the first 16 words into the remaining 48 words
    for (let j = 16; j < 64; j++) {
      const s0 = rightRotate(W[j-15], 7) ^ rightRotate(W[j-15], 18) ^ (W[j-15] >>> 3);
      const s1 = rightRotate(W[j-2], 17) ^ rightRotate(W[j-2], 19) ^ (W[j-2] >>> 10);
      W[j] = (W[j-16] + s0 + W[j-7] + s1) >>> 0;
    }
    
    // Initialize working variables to current hash value
    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];
    
    // Compression function main loop
    for (let j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[j] + W[j]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    
    // Add the compressed chunk to the current hash value
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  
  // Produce the final hash value (big-endian)
  const hashResult = H.map(h => h.toString(16).padStart(8, '0')).join('');
  return hashResult;
  
  // Helper function for right rotate
  function rightRotate(value, bits) {
    return ((value >>> bits) | (value << (32 - bits))) >>> 0;
  }
}

// Test runner that enforces chaining

async function runChainedTests(testContext) {
  const results = {};
  let previousHash = testContext.challenge?.powHash || "initial";
  
  try {
    
// Centralized test result hashing function
async function hashTestResult(testResult, previousHash, testId) {
  const resultStr = JSON.stringify(testResult, Object.keys(testResult).sort()) + previousHash;
  return await sha256(resultStr);
}

// Execute test: timing_loop (test_0d4eec3b)
console.log("Running test test_0d4eec3b");
const test_0d4eec3b_result = await testImplementations["test_0d4eec3b"](testContext, { previousHash });
results["test_0d4eec3b"] = test_0d4eec3b_result;

// Hash result with previous hash using centralized hashing function
previousHash = await hashTestResult(test_0d4eec3b_result, previousHash, "test_0d4eec3b");
console.log("Updated hash: " + previousHash.substring(0, 8) + "...");
  

// Execute test: webgl_extensions (test_dcb0cda1)
console.log("Running test test_dcb0cda1");
const test_dcb0cda1_result = await testImplementations["test_dcb0cda1"](testContext, { previousHash });
results["test_dcb0cda1"] = test_dcb0cda1_result;

// Hash result with previous hash using centralized hashing function
previousHash = await hashTestResult(test_dcb0cda1_result, previousHash, "test_dcb0cda1");
console.log("Updated hash: " + previousHash.substring(0, 8) + "...");
  

// Execute test: webgl_basic (test_4696e53a)
console.log("Running test test_4696e53a");
const test_4696e53a_result = await testImplementations["test_4696e53a"](testContext, { previousHash });
results["test_4696e53a"] = test_4696e53a_result;

// Hash result with previous hash using centralized hashing function
previousHash = await hashTestResult(test_4696e53a_result, previousHash, "test_4696e53a");
console.log("Updated hash: " + previousHash.substring(0, 8) + "...");
  

// Execute test: browser_fingerprint (test_1fb0bddb)
console.log("Running test test_1fb0bddb");
const test_1fb0bddb_result = await testImplementations["test_1fb0bddb"](testContext, { previousHash });
results["test_1fb0bddb"] = test_1fb0bddb_result;

// Hash result with previous hash using centralized hashing function
previousHash = await hashTestResult(test_1fb0bddb_result, previousHash, "test_1fb0bddb");
console.log("Updated hash: " + previousHash.substring(0, 8) + "...");
  
    
    return {
      results,
      finalHash: previousHash,
      completionTime: performance.now() - testContext.startTime
    };
  } catch (error) {
    console.error("Error running tests:", error);
    return {
      error: "Test execution failed",
      partialResults: results
    };
  }
}

// Initialize CaptchaSystem with integrated proof of work
window.CaptchaSystem = {
  verify: async function(challenge) {
    console.log("Starting verification for challenge:", challenge.id);
    
    try {
      // Step 1: Perform proof of work
      console.log("Running proof of work...");
      const powResult = await runProofOfWork(challenge);
      
      if (!powResult.solved) {
        console.error("Failed to solve proof of work challenge");
        return {
          success: false,
          error: "Failed proof of work",
          powResult
        };
      }
      
      console.log("Proof of work completed successfully");
      
      // Step 2: Use PoW hash as the initial hash for test chain
      console.log("Starting test verification chain...");
      const testResults = await runChainedTests({
        challenge: challenge,
        startTime: performance.now(),
        powHash: powResult.hash // Use PoW hash to start the chain
      });
      
      // Step 3: Combine PoW and test results for submission
      return {
        success: true,
        testResults: testResults.results,
        finalChainHash: testResults.finalHash,
        completionTime: powResult.timeSpent + testResults.completionTime,
        powResult: powResult
      };
    } catch (error) {
      console.error("Verification process failed:", error);
      return {
        success: false,
        error: error.message || "Unknown error during verification"
      };
    }
  }
};
