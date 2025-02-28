export const webglTests = {
  // Variations that can be randomly selected and customized
  variations: [
    {
      id: "webgl_basic",
      code: `
        function TEST_FUNCTION_NAME(ctx, params) {
          // Embed renderWebGLTest implementation directly
          function renderWebGLTest(gl, parameters) {
            const {width, height, seed} = parameters;
            
            // Set canvas to specified dimensions
            gl.canvas.width = width;
            gl.canvas.height = height;
            
            // Create shader program using seed to vary behavior
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, \`
              attribute vec4 a_position;
              void main() {
                gl_Position = a_position;
              }
            \`);
            gl.compileShader(vertexShader);
            
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, \`
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
            \`);
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
            let hash = ${Math.floor(Math.random() * 100000)}; // Random initial value
            for (let i = 0; i < samples.length; i++) {
              // Different hashing algorithms based on template instance
              ${[
                'hash = ((hash << 5) - hash) + samples[i]; hash |= 0;',
                'hash = (hash * 31 + samples[i]) & 0xFFFFFFFF;',
                'hash = (hash ^ samples[i]) + ((hash << 6) + (hash >> 2));',
                'hash = ((hash + samples[i]) * 16777619) & 0xFFFFFFFF;'
              ][Math.floor(Math.random() * 4)]}
            }
            
            return Math.abs(hash).toString(16).padStart(8, '0');
          }
          
          // Main test function body
          const gl = document.createElement('canvas').getContext('webgl');
          if (!gl) return { supported: false };
          
          // Use basic rendering with standard parameters
          const result = renderWebGLTest(gl, {
            width: PARAM_WIDTH,
            height: PARAM_HEIGHT,
            seed: PARAM_SEED + params.previousHash.substring(0, 8)
          });
          
          return {
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            result: hashPixelData(result),
            previousHashFragment: params.previousHash.substring(0, 8)
          };
        }
      `,
      // No external dependencies needed anymore
      dependencies: [],
      paramRanges: {
        PARAM_WIDTH: [256, 512, 1024],
        PARAM_HEIGHT: [256, 512, 1024],
        PARAM_SEED: "DYNAMIC" // Will be set at build time
      }
    },
    
    // Additional WebGL test with different approach
    {
      id: "webgl_extensions",
      code: `
        function TEST_FUNCTION_NAME(ctx, params) {
          // Embedded helper function for calculating hash
          function calculateHash(input) {
            let str = typeof input === 'string' ? input : JSON.stringify(input);
            let hash = ${Math.floor(Math.random() * 100000)}; // Random initial seed
            
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              ${[
                'hash = ((hash << 5) - hash) + char; hash |= 0;',
                'hash = (hash * 33) ^ char;',
                'hash = (hash + char) * 747796405 + 2891336453;',
                'hash = ((hash << 13) ^ hash) + (hash >>> 7) + char;'
              ][Math.floor(Math.random() * 4)]}
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
      `,
      dependencies: [],
      paramRanges: {} // No replaceable parameters
    }
  ]
};

export const timingTests = {
  variations: [
    {
      id: "timing_loop",
      code: `
        function TEST_FUNCTION_NAME(ctx, params) {
          // Use previous hash to modify loop behavior
          const hashSeed = parseInt(params.previousHash.substring(0, 8), 16);
          
          // Create unique loop count based on previous test's hash
          const baseLoopCount = PARAM_BASE_COUNT;
          const loopFactor = PARAM_LOOP_FACTOR;
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
            ${[
              'return Math.sin(i * 0.01) * Math.cos(prevResult * 0.01);',
              'return Math.tan(i * 0.01) / (1 + Math.abs(prevResult * 0.01));',
              'return Math.sqrt(1 + Math.abs(i + prevResult)) * 0.5;',
              'return Math.log(1 + Math.abs(i * prevResult + 1)) * 0.1;'
            ][Math.floor(Math.random() * 4)]}
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
      `,
      dependencies: [],
      paramRanges: {
        PARAM_BASE_COUNT: [100000, 300000, 500000, 1000000],
        PARAM_LOOP_FACTOR: [10000, 20000, 50000]
      }
    }
  ]
};

export const environmentTests = {
  variations: [
    {
      id: "browser_fingerprint",
      code: `
        function TEST_FUNCTION_NAME(ctx, params) {
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
            let hash = ${Math.floor(Math.random() * 1000000)};
            
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              ${[
                'hash = ((hash << 5) - hash) + char; hash |= 0;',
                'hash = (hash * 33) ^ char;',
                'hash = ((hash >> 16) ^ hash) * 0x45d9f3b;',
                'hash = ((hash << 7) ^ char) * 7;'
              ][Math.floor(Math.random() * 4)]}
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
      `,
      dependencies: []
    }
  ]
};

export const interactionTests = {
  variations: []
}

export const networkTests = {
  variations: []
}

export const inputBehaviorTests = {
  variations: []
}

export const deviceIntegrityTests = {
  variations: []
}

export const automationTests = {
  variations: []
}