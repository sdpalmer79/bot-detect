/**
 * WebGL fingerprinting test implementation
 * 
 * This test collects WebGL capabilities, performs rendering tests,
 * and creates a fingerprint of the graphics environment to detect
 * headless browsers, emulators, and automation tools.
 */

const crypto = require('crypto');

/**
 * WebGL fingerprinting test module implementing the standard test interface
 */
module.exports = {
  /**
   * Metadata about this test
   */
  meta: {
    id: "webgl_fingerprinting",
    name: "WebGL Fingerprinting Test",
    type: "automatic",
    category: "webgl"
  },

  /**
 * Returns client-side code with parameter placeholders
 * @param {string} [seed] - Seed for selecting test variation deterministically
 * @returns {string} JavaScript code with parameter placeholders
 */
getClientCode(seed) {
    // Select variation based on seed if provided
    if (!seed) {
      seed = Date.now().toString();
    }
    
    // Create a numeric hash of the seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    
    // Select variation using the hash
    const variations = this.getVariations();
    const index = Math.abs(hash) % variations.length;
    
    return variations[index].code;
  },

  /**
   * Returns all available variations for this test
   * @returns {Array} Array of available test variations
   */
  getVariations() {
    return [
      {
        id: "webgl_fingerprinting_standard",
        description: "Collects WebGL parameters and performs rendering tests",
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
        }`
      }
    ];
  },

  /**
   * Declares the parameters this test accepts
   * @returns {Object} Parameter definitions with possible ranges/defaults
   */
  getParameterDefinitions() {
    // WebGL test doesn't require any special parameters
    return {};
  },

  /**
 * Verifies test results against expected values
 * @param {Object} result - Client-submitted test result
 * @param {Object} challenge - Original challenge parameters
 * @param {Object} testParams - Test parameters from suite
 * @returns {Object} Verification result with standardized format
 */
verifyResult(result, challenge, testParams) {
    try {
      // Check if result is valid and test ran successfully
      if (!result || result.error) {
        return {
          valid: false,
          botProbability: 0.8,
          confidence: 0.7,
          details: {
            error: result?.error || 'Invalid test result'
          }
        };
      }
  
      // Initialize scoring variables
      let botProbability = 0.1; // Start with low probability
      let anomalyCount = 0;
      let confidence = 0.8;
      let variationDetails = {};
      
      // Detect which variation was used based on result structure
      const isStandardVariation = !!result.rendererInfo || !!result.parameters;
      const isPrecisionVariation = !!result.precision || !!result.floatingPoint;
      
      // Basic check that applies to both variations
      if (!result.webglSupport.webgl1 && !result.webglSupport.webgl2) {
        botProbability += 0.5;
        anomalyCount++;
        confidence = 0.9;
      }
  
      // Process common anomalies for both variations
      if (Array.isArray(result.anomalies)) {
        anomalyCount += result.anomalies.length;
        
        // Process common critical anomalies
        result.anomalies.forEach(anomaly => {
          if (anomaly === 'no_webgl_support') {
            botProbability += 0.5;
          }
        });
      }
  
      // Specific verification for the standard variation
      if (isStandardVariation) {
        variationDetails.type = "standard";
        
        // Check WebGL renderer info for known bot/VM/emulator patterns
        if (result.rendererInfo && result.rendererInfo.renderer) {
          const rendererStr = result.rendererInfo.renderer.toLowerCase();
          const vendorStr = (result.rendererInfo.vendor || '').toLowerCase();
          
          // Known suspicious renderer strings
          const suspiciousRenderers = [
            'swiftshader', 'llvmpipe', 'vmware', 'virtualbox', 'microsoft basic render',
            'headless', 'software', 'chromium', 'angle', 'mesa offscreen', 'gdi generic'
          ];
          
          for (const suspicious of suspiciousRenderers) {
            if (rendererStr.includes(suspicious)) {
              botProbability += 0.4;
              anomalyCount++;
              break;
            }
          }
          
          // Check for suspicious vendor strings
          if (vendorStr.includes('google') && !vendorStr.includes('intel')) {
            botProbability += 0.2;
            anomalyCount++;
          }
        }
  
        // Weight certain anomalies specific to standard test
        if (Array.isArray(result.anomalies)) {
          result.anomalies.forEach(anomaly => {
            switch (anomaly) {
              case 'rendering_test_error':
              case 'suspiciously_fast_draw_calls':
                botProbability += 0.3;
                break;
                
              case 'missing_critical_extensions':
              case 'texture_allocation_failed':
                botProbability += 0.2;
                break;
                
              default:
                botProbability += 0.1;
            }
          });
        }
  
        // Check for rendering test results
        if (result.renderingTests && 
            result.renderingTests.run_0 && 
            result.renderingTests.run_1) {
          // Compare pixel samples between runs, they should be different due to time parameter change
          const samples0 = result.renderingTests.run_0.samples;
          const samples1 = result.renderingTests.run_1.samples;
          
          // When both runs produce identical output despite different time inputs,
          // it suggests rendering is faked or deterministic in a way real GPUs aren't
          let identicalSamples = 0;
          let comparedSamples = 0;
          
          for (const key in samples0) {
            if (samples1[key]) {
              comparedSamples++;
              const pixelA = samples0[key];
              const pixelB = samples1[key];
              
              if (pixelA.r === pixelB.r && 
                  pixelA.g === pixelB.g && 
                  pixelA.b === pixelB.b && 
                  pixelA.a === pixelB.a) {
                identicalSamples++;
              }
            }
          }
          
          if (comparedSamples > 0 && identicalSamples/comparedSamples > 0.8) {
            botProbability += 0.3;
            anomalyCount++;
          }
        }
  
        // Check performance metrics
        if (result.performanceMetrics) {
          // Texture creation time too fast or too slow
          if (result.performanceMetrics.textureCreationTime < 10 ||
              result.performanceMetrics.textureCreationTime > 10000) {
            botProbability += 0.2;
            anomalyCount++;
          }
  
          // Draw calls overhead abnormal
          if (result.performanceMetrics.drawCallsOverhead < 10 ||
              result.performanceMetrics.drawCallsOverhead > 5000) {
            botProbability += 0.2;
            anomalyCount++;
          }
        }
        
        variationDetails.rendererInfo = result.rendererInfo;
        variationDetails.performanceMetrics = result.performanceMetrics;
      } 
      // Specific verification for the precision variation
      else if (isPrecisionVariation) {
        variationDetails.type = "precision";
        
        // Check shader precision anomalies
        if (result.precision) {
          // Check for suspicious high-precision float support
          // Real GPUs follow certain precision standards
          if (result.precision.fragment && result.precision.fragment.HIGH_FLOAT) {
            const highFloatPrecision = result.precision.fragment.HIGH_FLOAT.precision;
            
            // Most real GPUs have exactly 23 bits of precision for highp float in fragment shaders
            if (highFloatPrecision !== 23) {
              // Either very low or unusually high precision is suspicious
              if (highFloatPrecision < 16 || highFloatPrecision > 24) {
                botProbability += 0.2;
                anomalyCount++;
              }
            }
          }
          
          // Check for inconsistencies between vertex and fragment precision
          // In real GPUs, vertex precision is generally >= fragment precision
          if (result.precision.vertex && 
              result.precision.fragment && 
              result.precision.vertex.HIGH_FLOAT && 
              result.precision.fragment.HIGH_FLOAT) {
            
            const vertexPrecision = result.precision.vertex.HIGH_FLOAT.precision;
            const fragmentPrecision = result.precision.fragment.HIGH_FLOAT.precision;
            
            if (vertexPrecision < fragmentPrecision) {
              botProbability += 0.2;
              anomalyCount++;
            }
          }
          
          variationDetails.shaderPrecision = { 
            vertex: result.precision.vertex?.HIGH_FLOAT?.precision,
            fragment: result.precision.fragment?.HIGH_FLOAT?.precision
          };
        }
        
        // Check floating point test results
        if (result.floatingPoint && result.floatingPoint.results) {
          const fpResults = result.floatingPoint.results;
          
          // Check for suspicious uniformity in floating point results
          // Real GPUs have some variability in how they handle floating point edge cases
          if (fpResults.test_0 && fpResults.test_1 && fpResults.test_2) {
            // Compare output pixels - in real GPUs, different inputs should produce different outputs
            const allOutputsSame = 
              JSON.stringify(fpResults.test_0.output) === JSON.stringify(fpResults.test_1.output) &&
              JSON.stringify(fpResults.test_1.output) === JSON.stringify(fpResults.test_2.output);
              
            if (allOutputsSame) {
              botProbability += 0.3;
              anomalyCount++;
            }
          }
        }
        
        // Check 3D rendering results
        if (result.rendering3D) {
          // In real GPUs, 3D rendering with lighting produces variation in pixel colors
          if (result.rendering3D.pixelSamples) {
            const pixelData = result.rendering3D.pixelSamples.data;
            
            if (Array.isArray(pixelData) && pixelData.length > 0) {
              // Check if all pixels are exactly the same (suspicious)
              let allSame = true;
              for (let i = 4; i < pixelData.length; i += 4) {
                if (pixelData[i] !== pixelData[0] || 
                    pixelData[i+1] !== pixelData[1] || 
                    pixelData[i+2] !== pixelData[2]) {
                  allSame = false;
                  break;
                }
              }
              
              if (allSame) {
                botProbability += 0.3;
                anomalyCount++;
              }
            }
          }
        }
        
        // Check uniform array test results
        if (result.uniformsTest) {
          // Check for compilation or linking failures that shouldn't happen on real GPUs
          if (!result.uniformsTest.compilationResult?.vertexShader || 
              !result.uniformsTest.compilationResult?.fragmentShader ||
              !result.uniformsTest.linkResult) {
            botProbability += 0.2;
            anomalyCount++;
          }
          
          // Check for GL errors during uniform array handling
          if (result.uniformsTest.glError && result.uniformsTest.glError !== 0) {
            botProbability += 0.2;
            anomalyCount++;
          }
        }
        
        // Check anomalies specific to precision variation
        if (Array.isArray(result.anomalies)) {
          result.anomalies.forEach(anomaly => {
            switch (anomaly) {
              case 'fp_shader_compilation_failed':
              case 'suspicious_high_float_precision':
              case 'fp_results_suspiciously_uniform':
              case 'suspicious_3d_rendering_uniformity':
                botProbability += 0.3;
                break;
                
              case '3d_rendering_test_error':
              case 'floating_point_test_error':
                botProbability += 0.2;
                break;
                
              default:
                botProbability += 0.1;
            }
          });
        }
        
        variationDetails.fingerprint3D = result.rendering3D?.fingerprint;
      }
      // Unknown test variation - mark as suspicious
      else {
        botProbability += 0.4;
        confidence = 0.6;
        variationDetails.type = "unknown";
      }
  
      // Cap probability between 0 and 1
      botProbability = Math.min(Math.max(botProbability, 0), 1);
      
      // Adjust confidence based on how many signals we detected
      if (anomalyCount > 5) {
        confidence = 0.95;
      } else if (anomalyCount > 3) {
        confidence = 0.9;
      } else if (anomalyCount > 0) {
        confidence = 0.8;
      } else if (anomalyCount === 0) {
        confidence = 0.7;
      }
  
      return {
        valid: botProbability < 0.5, // Consider the test passed if bot probability is low
        botProbability,
        confidence,
        details: {
          webglSupport: result.webglSupport,
          variationType: variationDetails.type,
          anomalyCount,
          anomalies: result.anomalies,
          fingerprint: result.fingerprint,
          variationDetails
        }
      };
    } catch (error) {
      return {
        valid: false,
        botProbability: 0.5,
        confidence: 0.3,
        details: {
          error: error.message
        }
      };
    }
  }
};