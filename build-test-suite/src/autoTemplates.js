const tokenTests = {
  category: "tokenTests",
  variations: [
    {
      id: "token_verification",
      description: "Performs verification of the challenge token",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Extract required data from challenge
          const token = ctx.challenge.token || "";
          const timestamp = ctx.challenge.timestamp || 0;
          const challengeId = ctx.challenge.id || "";
          
          // Suite-specific transformation seed (static for this suite)
          const TRANSFORM_SEED = PARAM_TRANSFORM_SEED;
          
          // DEBUG: Log input parameters
          console.log('=== TOKEN VERIFICATION DEBUG ===');
          console.log(\`token: \${token} challengeId: \${challengeId} timestamp: \${timestamp} seed: \${TRANSFORM_SEED}\`);
          
          // Start time measurement
          const startTime = performance.now();
          
          // Phase 1: Initial hash of token with challenge data
          let digest = await sha256(token + challengeId + timestamp);
          console.log('Initial hash:', digest);
          
          // Phase 2: Suite-specific transformation
          digest = await performSuiteTransform(digest, TRANSFORM_SEED);
          console.log('After suite transform:', digest);
          
          // Phase 3: Multiple rounds of computation
          // The number of rounds is determined by the first byte of the transform seed
          const rounds = (parseInt(TRANSFORM_SEED.substring(0, 2), 16) % 7) + 3; // 3-10 rounds
          console.log(\`Calculated rounds: \${rounds}\`);
          
          for (let i = 0; i < rounds; i++) {
            // Use digest with round number for unique per-round hashing
            const preHashInput = digest + (i.toString()) + token.substring(0, 8);
            console.log(\`Round \${i} input: \${preHashInput.substring(0, 20)}...\`);
            digest = await sha256(preHashInput);
            console.log(\`Round \${i} after SHA: \${digest}\`);
            
            // Apply additional transformations based on round number
            digest = await applyRoundTransformation(digest, i, TRANSFORM_SEED);
            console.log(\`Round \${i} after transform: \${digest}\`);
          }
          
          // Calculate completion time
          const duration = performance.now() - startTime;
          console.log(\`Final hash: \${digest}\`);
          console.log(\`Returning tokenHash: \${digest.substring(0, 16)}\`);
          
          // Return verification result with minimal data
          return {
            tokenHash: digest.substring(0, 16), // Truncated hash value
            duration: duration,
            rounds: rounds,
            processedAt: Date.now()
          };
        } catch (error) {
          console.error('Token verification error:', error);
          return {
            error: "Token verification failed",
            errorMessage: error.message
          };
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
          console.log('Suite transform start:', result);
          
          for (let i = 0; i < seedValues.length && i < 8; i++) {
            const value = seedValues[i];
            const position = value % result.length;
            
            // Different transformations based on seed value
            if (value % 4 === 0) {
              result = result.substring(position) + result.substring(0, position);
              console.log(\`Transform \${i} (rotate): \${result.substring(0, 20)}...\`);
            } else if (value % 4 === 1) {
              result = await sha256(result + value.toString());
              console.log(\`Transform \${i} (hash+value): \${result.substring(0, 20)}...\`);
            } else if (value % 4 === 2) {
              result = result.split('').reverse().join('');
              console.log(\`Transform \${i} (reverse): \${result.substring(0, 20)}...\`);
            } else {
              result = await sha256(value.toString() + result);
              console.log(\`Transform \${i} (value+hash): \${result.substring(0, 20)}...\`);
            }
          }
          
          return result;
        }
        
        // Round-specific transformation function
        async function applyRoundTransformation(input, round, seed) {
          // Select transformation based on round number and seed
          const transformType = (parseInt(seed.substring(round % seed.length, round % seed.length + 2), 16) + round) % 5;
          console.log(\`Round \${round} transform type: \${transformType}\`);
          
          switch (transformType) {
            case 0: // Reverse substrings
              const mid = Math.floor(input.length / 2);
              return input.substring(mid) + input.substring(0, mid);
              
            case 1: // XOR with round number
              return input.split('').map((char, i) => 
                String.fromCharCode(char.charCodeAt(0) ^ ((round + 1) * (i + 1) % 256))
              ).join('');
              
            case 2: // Interleave halves
              const firstHalf = input.substring(0, input.length/2);
              const secondHalf = input.substring(input.length/2);
              let interleaved = '';
              for (let i = 0; i < firstHalf.length; i++) {
                interleaved += firstHalf[i] + (secondHalf[i] || '');
              }
              return interleaved;
              
            case 3: // Add round signature
              return await sha256(input + round.toString().repeat(round + 1));
              
            case 4: // Rotate by round number
              const rotation = (round + 1) * 3 % input.length;
              return input.substring(rotation) + input.substring(0, rotation);
              
            default:
              return input;
          }
        }
      }`,
      paramRanges: {
        PARAM_TRANSFORM_SEED: "SUITE_TRANSFORM_SEED"
      },
    }
  ]
};

const webglTests = {
  category: "webglTests",
  variations: [
    {
      id: "webgl_fingerprinting",
      description: "Tests WebGL capabilities, fingerprints the renderer, and performs rendering tests to detect headless environments",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Start timing
          const startTime = performance.now();
          
          // Calculate uniqueSeed from challenge timestamp at runtime
          const uniqueSeed = (ctx.challenge.timestamp % 10000) / 10000;
          
          // Collect basic WebGL support information
          const result = {
            webglSupport: {
              webgl1: false,
              webgl2: false
            },
            rendererInfo: {},
            parameters: {},
            extensions: [],
            consistencyTests: {},
            renderingTests: {},
            performanceMetrics: {},
            fingerprint: "",
            anomalies: []
          };
          
          // Test WebGL 1 support
          const gl1Canvas = document.createElement('canvas');
          const gl1 = gl1Canvas.getContext('webgl') || gl1Canvas.getContext('experimental-webgl');
          result.webglSupport.webgl1 = !!gl1;
          
          // Test WebGL 2 support
          const gl2Canvas = document.createElement('canvas');
          const gl2 = gl2Canvas.getContext('webgl2');
          result.webglSupport.webgl2 = !!gl2;
          
          // Use whichever context is available, prioritizing WebGL 2
          const gl = gl2 || gl1;
          
          // If no WebGL support at all, return early
          if (!gl) {
            result.anomalies.push("no_webgl_support");
            return result;
          }
          
          // Collect renderer information
          try {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              result.rendererInfo = {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                vendorUnmasked: true
              };
            } else {
              // Fallback if debug info extension is not available
              result.rendererInfo = {
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER),
                vendorUnmasked: false
              };
            }
            
            // Add version information
            result.rendererInfo.version = gl.getParameter(gl.VERSION);
            result.rendererInfo.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
          } catch (e) {
            result.anomalies.push("renderer_info_error");
            result.rendererInfo.error = e.message;
          }
          
          // Collect WebGL parameters that can help identify emulation
          try {
            const parametersToTest = [
              'MAX_VERTEX_UNIFORM_VECTORS',
              'MAX_VERTEX_ATTRIBS',
              'MAX_TEXTURE_SIZE',
              'MAX_RENDER_BUFFER_SIZE',
              'MAX_VIEWPORT_DIMS',
              'ALIASED_LINE_WIDTH_RANGE',
              'ALIASED_POINT_SIZE_RANGE',
              'RED_BITS',
              'GREEN_BITS',
              'BLUE_BITS',
              'ALPHA_BITS',
              'DEPTH_BITS',
              'MAX_TEXTURE_IMAGE_UNITS'
            ];
            
            parametersToTest.forEach(param => {
              try {
                result.parameters[param] = gl[param] ? gl.getParameter(gl[param]) : null;
              } catch (e) {
                // Some parameters might not be available depending on implementation
                result.parameters[param] = 'error';
              }
            });
          } catch (e) {
            result.anomalies.push("parameters_error");
          }
          
          // Collect available extensions
          try {
            const extensions = gl.getSupportedExtensions() || [];
            result.extensions = extensions;
            
            // Check for suspicious extension patterns
            const requiredExtensions = [
              'ANGLE_instanced_arrays',
              'EXT_blend_minmax',
              'EXT_texture_filter_anisotropic',
              'WEBKIT_EXT_texture_filter_anisotropic',
              'OES_texture_float',
              'OES_texture_float_linear',
              'OES_standard_derivatives'
            ];
            
            const missingExtensions = requiredExtensions.filter(ext => 
              !extensions.includes(ext) && !extensions.includes('WEBKIT_' + ext));
              
            if (missingExtensions.length > requiredExtensions.length / 2) {
              result.anomalies.push("missing_critical_extensions");
            }
          } catch (e) {
            result.anomalies.push("extensions_error");
          }
          
          // Basic consistency tests (looking for behavior typical in emulators/headless browsers)
          try {
            // Test 1: Check if MAX_TEXTURE_SIZE is reasonable (should be between 2048-16384 for most devices)
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            result.consistencyTests.textureSizeConsistent = maxTextureSize >= 2048 && maxTextureSize <= 32768;
            
            if (!result.consistencyTests.textureSizeConsistent) {
              result.anomalies.push("suspicious_texture_size");
            }
            
            // Test 2: Check if we can actually create a texture of the reported max size / 2
            // (Some emulators report high values but can't allocate them)
            const testSize = Math.min(maxTextureSize / 2, 4096); // Don't try anything too large
            
            let textureCreationSuccessful = false;
            try {
              const texture = gl.createTexture();
              gl.bindTexture(gl.TEXTURE_2D, texture);
              gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, testSize, testSize, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, null
              );
              textureCreationSuccessful = gl.getError() === gl.NO_ERROR;
              gl.deleteTexture(texture);
            } catch (e) {
              textureCreationSuccessful = false;
            }
            
            result.consistencyTests.textureAllocationConsistent = textureCreationSuccessful;
            if (!textureCreationSuccessful) {
              result.anomalies.push("texture_allocation_failed");
            }
          } catch (e) {
            result.anomalies.push("consistency_test_error");
          }
          
          // Rendering tests to identify headless/automated environments
          try {
            // Create a new canvas for our rendering test
            const renderCanvas = document.createElement('canvas');
            renderCanvas.width = 256;
            renderCanvas.height = 256;
            const renderGL = renderCanvas.getContext('webgl');
            
            if (renderGL) {
              // Create vertex and fragment shaders
              const vertexShader = renderGL.createShader(renderGL.VERTEX_SHADER);
              renderGL.shaderSource(vertexShader, \`
                attribute vec2 position;
                varying vec2 texCoord;
                
                void main() {
                  texCoord = position * 0.5 + 0.5;
                  gl_Position = vec4(position, 0.0, 1.0);
                }
              \`);
              renderGL.compileShader(vertexShader);
              
              const fragmentShader = renderGL.createShader(renderGL.FRAGMENT_SHADER);
              renderGL.shaderSource(fragmentShader, \`
                precision mediump float;
                varying vec2 texCoord;
                uniform float time;
                
                float rand(vec2 n) {
                  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
                }
                
                vec3 hsv2rgb(vec3 c) {
                  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
                }
                
                void main() {
                  // Use pre-calculated uniqueSeed value
                  float uniqueSeed = \${uniqueSeed};
                  
                  vec2 uv = texCoord;
                  float t = time * 0.001 + uniqueSeed;
                  
                  // Create a pattern that's sensitive to rendering precision
                  float radius = length(uv - vec2(0.5));
                  float angle = atan(uv.y - 0.5, uv.x - 0.5);
                  
                  float ringValue = sin(radius * 20.0 + t * 5.0) * 0.5 + 0.5;
                  float angularValue = cos(angle * 5.0 + t) * 0.5 + 0.5;
                  
                  // Create a complex gradient that should vary between implementations
                  vec3 color = hsv2rgb(vec3(
                    fract(t + ringValue * angularValue),
                    0.7 + 0.3 * sin(radius * 15.0),
                    0.8 + 0.2 * cos(angle * 8.0)
                  ));
                  
                  // Add noise that will be quantized differently by different implementations
                  float noise = rand(uv + vec2(t)) * 0.05;
                  
                  gl_FragColor = vec4(color + noise, 1.0);
                }
              \`);
              renderGL.compileShader(fragmentShader);
              
              // Check for shader compilation errors
              if (!renderGL.getShaderParameter(vertexShader, renderGL.COMPILE_STATUS)) {
                result.anomalies.push("vertex_shader_compilation_failed");
              }
              if (!renderGL.getShaderParameter(fragmentShader, renderGL.COMPILE_STATUS)) {
                result.anomalies.push("fragment_shader_compilation_failed");
              }
              
              // Create program and link shaders
              const program = renderGL.createProgram();
              renderGL.attachShader(program, vertexShader);
              renderGL.attachShader(program, fragmentShader);
              renderGL.linkProgram(program);
              renderGL.useProgram(program);
              
              // Create a square covering the canvas
              const vertices = new Float32Array([
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                1.0, 1.0
              ]);
              
              const vertexBuffer = renderGL.createBuffer();
              renderGL.bindBuffer(renderGL.ARRAY_BUFFER, vertexBuffer);
              renderGL.bufferData(renderGL.ARRAY_BUFFER, vertices, renderGL.STATIC_DRAW);
              
              const positionLocation = renderGL.getAttribLocation(program, "position");
              renderGL.enableVertexAttribArray(positionLocation);
              renderGL.vertexAttribPointer(positionLocation, 2, renderGL.FLOAT, false, 0, 0);
              
              const timeLocation = renderGL.getUniformLocation(program, "time");
              
              // Perform rendering with two different time values
              for (let testRun = 0; testRun < 2; testRun++) {
                const testTime = testRun * 500; // 0ms and 500ms
                renderGL.uniform1f(timeLocation, testTime);
                renderGL.clearColor(0, 0, 0, 1);
                renderGL.clear(renderGL.COLOR_BUFFER_BIT);
                renderGL.drawArrays(renderGL.TRIANGLE_STRIP, 0, 4);
                
                // Read pixels
                const pixels = new Uint8Array(renderCanvas.width * renderCanvas.height * 4);
                renderGL.readPixels(0, 0, renderCanvas.width, renderCanvas.height, 
                                   renderGL.RGBA, renderGL.UNSIGNED_BYTE, pixels);
                
                // Sample a few pixels and record their values
                const samples = [
                  [64, 64],
                  [128, 128],
                  [192, 192],
                  [64, 192],
                  [192, 64]
                ];
                
                const pixelSamples = {};
                samples.forEach((coords, i) => {
                  const x = coords[0];
                  const y = coords[1];
                  const index = (y * renderCanvas.width + x) * 4;
                  pixelSamples[\`pixel_\${i}\`] = {
                    r: pixels[index],
                    g: pixels[index + 1],
                    b: pixels[index + 2],
                    a: pixels[index + 3]
                  };
                });
                
                result.renderingTests[\`run_\${testRun}\`] = {
                  time: testTime,
                  samples: pixelSamples
                };
              }
              
              // Calculate fingerprint from sampled pixels - simple hash of values
              const pixelValues = Object.values(result.renderingTests)
                .map(run => Object.values(run.samples)
                  .flatMap(px => [px.r, px.g, px.b, px.a]))
                .flat();
              
              // Create a simple hash of the pixel values
              let hash = 0;
              for (let i = 0; i < pixelValues.length; i++) {
                hash = ((hash << 5) - hash) + pixelValues[i];
                hash = hash & hash; // Convert to 32bit integer
              }
              result.fingerprint = hash.toString(16).padStart(8, '0');
            }
          } catch (e) {
            result.anomalies.push("rendering_test_error");
            result.renderingError = e.message;
          }
          
          // Performance tests
          try {
            const perfCanvas = document.createElement('canvas');
            perfCanvas.width = 512; 
            perfCanvas.height = 512;
            const perfGL = perfCanvas.getContext('webgl');
            
            if (perfGL) {
              // Test 1: Measure time to create and fill textures
              const textureStart = performance.now();
              const textureCount = 5;
              const textureSizes = [256, 512, 1024, 1024, 2048]; // Increasing sizes
              
              for (let i = 0; i < textureCount; i++) {
                const size = textureSizes[i];
                const texture = perfGL.createTexture();
                perfGL.bindTexture(perfGL.TEXTURE_2D, texture);
                
                // Create a typed array of the appropriate size filled with random data
                const data = new Uint8Array(size * size * 4);
                for (let j = 0; j < data.length; j++) {
                  data[j] = Math.floor(Math.random() * 256);
                }
                
                // Upload the texture data
                try {
                  perfGL.texImage2D(
                    perfGL.TEXTURE_2D, 0, perfGL.RGBA, size, size, 0,
                    perfGL.RGBA, perfGL.UNSIGNED_BYTE, data
                  );
                  perfGL.generateMipmap(perfGL.TEXTURE_2D);
                } catch (e) {
                  result.anomalies.push(\`texture_\${size}_creation_failed\`);
                }
                
                perfGL.deleteTexture(texture);
              }
              
              const textureEnd = performance.now();
              result.performanceMetrics.textureCreationTime = textureEnd - textureStart;
              
              // If texture creation is too fast, it may indicate emulation
              if (result.performanceMetrics.textureCreationTime < 5) {
                result.anomalies.push("suspiciously_fast_texture_creation");
              }
              
              // Test 2: Measure driver overhead for many draw calls
              perfGL.clear(perfGL.COLOR_BUFFER_BIT);
              const drawStart = performance.now();
              
              // Create a simple program for drawing
              const vShader = perfGL.createShader(perfGL.VERTEX_SHADER);
              perfGL.shaderSource(vShader, \`
                attribute vec2 position;
                void main() {
                  gl_Position = vec4(position, 0.0, 1.0);
                  gl_PointSize = 1.0;
                }
              \`);
              perfGL.compileShader(vShader);
              
              const fShader = perfGL.createShader(perfGL.FRAGMENT_SHADER);
              perfGL.shaderSource(fShader, \`
                precision mediump float;
                void main() {
                  gl_FragColor = vec4(1.0, 0.5, 0.2, 1.0);
                }
              \`);
              perfGL.compileShader(fShader);
              
              const prog = perfGL.createProgram();
              perfGL.attachShader(prog, vShader);
              perfGL.attachShader(prog, fShader);
              perfGL.linkProgram(prog);
              perfGL.useProgram(prog);
              
              // Create vertices for points
              const pointCount = 1000;
              const pointVertices = new Float32Array(pointCount * 2);
              for (let i = 0; i < pointCount; i++) {
                pointVertices[i * 2] = Math.random() * 2 - 1;     // x: -1 to 1
                pointVertices[i * 2 + 1] = Math.random() * 2 - 1; // y: -1 to 1
              }
              
              const pointBuffer = perfGL.createBuffer();
              perfGL.bindBuffer(perfGL.ARRAY_BUFFER, pointBuffer);
              perfGL.bufferData(perfGL.ARRAY_BUFFER, pointVertices, perfGL.STATIC_DRAW);
              
              const posLoc = perfGL.getAttribLocation(prog, "position");
              perfGL.enableVertexAttribArray(posLoc);
              perfGL.vertexAttribPointer(posLoc, 2, perfGL.FLOAT, false, 0, 0);
              
              // Draw 1000 points as separate draw calls to measure driver overhead
              for (let i = 0; i < pointCount; i++) {
                perfGL.drawArrays(perfGL.POINTS, i, 1);
              }
              
              const drawEnd = performance.now();
              result.performanceMetrics.drawCallsOverhead = drawEnd - drawStart;
              
              // Typical draw call overhead should be significant on real GPUs
              // On emulated GL, this might be unusually fast or slow
              if (result.performanceMetrics.drawCallsOverhead < 10) {
                result.anomalies.push("suspiciously_fast_draw_calls");
              } else if (result.performanceMetrics.drawCallsOverhead > 2000) {
                result.anomalies.push("suspiciously_slow_draw_calls");
              }
            }
          } catch (e) {
            result.anomalies.push("performance_test_error");
            result.performanceTestError = e.message;
          }
          
          // Calculate overall duration
          result.duration = performance.now() - startTime;
          
          return result;
        } catch (error) {
          return {
            error: "WebGL test failed",
            errorMessage: error.message,
            errorStack: error.stack
          };
        }
      }`,
      paramRanges: {}
    }
  ]
};

const timingTests = {
  variations: []
};

const environmentTests = {
  variations: []
};

const interactionTests = {
  variations: []
}

const networkTests = {
  variations: []
}

const inputBehaviorTests = {
  variations: []
}

const deviceIntegrityTests = {
  variations: []
}

const automationTests = {
  variations: []
}

module.exports = {
  tokenTests,
  webglTests,
  timingTests,
  environmentTests,
  interactionTests,
  networkTests,
  inputBehaviorTests,
  deviceIntegrityTests,
  automationTests
};