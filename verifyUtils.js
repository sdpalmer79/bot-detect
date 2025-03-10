const crypto = require('crypto');

/**
 * Evaluates token verification test results
 * @param {Object} result - Client test result
 * @param {Object} challenge - Challenge data sent to client
 * @param {Object} suiteData - Suite configuration data
 * @returns {Object} Evaluation results with standardized format
 */
async function evaluateTokenVerification(result, challenge, suiteData) {
  console.log('Evaluating token verification result:', result);
  
  try {
    // Check if result is valid
    if (!result || result.error) {
      return {
        valid: false,
        botProbability: 0.9,
        confidence: 0.8,
        details: {
          hashValid: false,
          error: result?.error || 'Invalid test result'
        }
      };
    }
    
    // Extract required data
    const token = challenge.token;
    const challengeId = challenge.id;
    const timestamp = challenge.timestamp;

    // Retrieve transform seed from suite data
    const test = suiteData.tests.find(test => test.originalId === 'token_verification');
    const transformSeed = test.paramValues['PARAM_TRANSFORM_SEED'];
    
    // Calculate expected tokenHash using server-side implementation
    const expectedHash = await calculateClientCompatibleHash(
      token, 
      challengeId, 
      timestamp, 
      transformSeed
    );
    
    // Compare with received hash
    const hashValid = (result.tokenHash === expectedHash.substring(0, 16));
    
    // Check timing for anomalies
    const executionTime = result.duration;
    const timingNormal = executionTime > 5; // Minimum reasonable time
    const timingSuspicious = executionTime < 10 || executionTime > 5000;
    
    // Additional security checks
    const expectedRounds = (parseInt(transformSeed.substring(0, 2), 16) % 7) + 3;
    const roundsMatch = result.rounds === expectedRounds;
    
    // Calculate bot probability
    let botProbability = 0.1; // Start with low probability
    
    if (!hashValid) botProbability += 0.6;
    if (!roundsMatch) botProbability += 0.4;
    if (!timingNormal) botProbability += 0.2;
    if (timingSuspicious) botProbability += 0.1;
    
    // Cap probability between 0 and 1
    botProbability = Math.min(Math.max(botProbability, 0), 1);
    
    return {
      valid: hashValid && timingNormal && roundsMatch,
      botProbability,
      confidence: hashValid ? 0.95 : 0.8,
      details: {
        hashValid,
        timingNormal,
        roundsMatch,
        expectedHashPrefix: expectedHash.substring(0, 16),
        receivedHashPrefix: result.tokenHash,
        expectedRounds,
        reportedRounds: result.rounds,
        processingTime: result.duration
      }
    };
  } catch (error) {
    console.error('Error evaluating token verification:', error);
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

/**
 * Calculates token hash using the client algorithm with environment-agnostic behavior
 */
async function calculateClientCompatibleHash(token, challengeId, timestamp, transformSeed) {
  // CRITICAL: Use explicit string conversion with consistent method
  // This prevents differences in implicit type conversion between environments
  const tokenStr = String(token);
  const challengeIdStr = String(challengeId);
  const timestampStr = timestamp.toString(); // Explicit toString() for numbers
  
  console.log('=== SERVER HASH CALCULATION ===');
  console.log(`Input parameters (after string conversion):`);
  console.log(`token: "${tokenStr}" (${typeof tokenStr})`);
  console.log(`challengeId: "${challengeIdStr}" (${typeof challengeIdStr})`);
  console.log(`timestamp: "${timestampStr}" (${typeof timestampStr})`);
  console.log(`seed: "${transformSeed}" (${typeof transformSeed})`);
  
  // Phase 1: Initial hash of token with challenge data
  let digest = await sha256(tokenStr + challengeIdStr + timestampStr);
  console.log('Initial hash:', digest);
  
  // Phase 2: Suite-specific transformation
  digest = await performSuiteTransform(digest, transformSeed);
  console.log('After suite transform:', digest);
  
  // Phase 3: Multiple rounds of computation
  const rounds = (parseInt(transformSeed.substring(0, 2), 16) % 7) + 3;
  console.log(`Calculated rounds: ${rounds}`);
  
  for (let i = 0; i < rounds; i++) {
    // IMPORTANT: Match client's string concatenation exactly
    const preHashInput = digest + i.toString() + tokenStr.substring(0, 8);
    console.log(`Round ${i} input: ${preHashInput.substring(0, 20)}...`);
    
    digest = await sha256(preHashInput);
    console.log(`Round ${i} after SHA:`, digest);
    
    digest = await applyRoundTransformation(digest, i, transformSeed);
    console.log(`Round ${i} after transform:`, digest);
  }
  
  console.log(`Final hash: ${digest}`);
  return digest;
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
  for (let i = 0; i < seedValues.length && i < 8; i++) {
    const value = seedValues[i];
    const position = value % result.length;
    
    // Different transformations based on seed value
    if (value % 4 === 0) {
      result = result.substring(position) + result.substring(0, position);
    } else if (value % 4 === 1) {
      result = await sha256(result + value.toString());
    } else if (value % 4 === 2) {
      result = result.split('').reverse().join('');
    } else {
      result = await sha256(value.toString() + result);
    }
  }
  
  return result;
}

// Round-specific transformation function with consistent cross-environment behavior
async function applyRoundTransformation(input, round, seed) {
  const transformType = (parseInt(seed.substring(round % seed.length, round % seed.length + 2), 16) + round) % 5;
  console.log(`Round ${round} transform type: ${transformType}`);
  
  switch (transformType) {
    case 0: // Reverse substrings - no change needed
      const mid = Math.floor(input.length / 2);
      return input.substring(mid) + input.substring(0, mid);
      
    case 1: { // XOR with round number - fixed for cross-environment consistency
      // CRITICAL: Use explicit numeric conversions and bitwise operations
      // This ensures consistent behavior across all environments
      const result = [];
      for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        // Ensure the operation stays within 0-255 range with explicit modulo
        const xorValue = ((round + 1) * (i + 1)) % 256;
        // Use bitwise XOR (^) with explicit conversion back to valid char range
        const newCharCode = (charCode ^ xorValue) & 0xFF;
        result.push(String.fromCharCode(newCharCode));
      }
      return result.join('');
    }
      
    case 2: // Interleave halves - no change needed
      const firstHalf = input.substring(0, input.length/2);
      const secondHalf = input.substring(input.length/2);
      let interleaved = '';
      for (let i = 0; i < firstHalf.length; i++) {
        interleaved += firstHalf[i] + (secondHalf[i] || '');
      }
      return interleaved;
      
    case 3: // Add round signature - ensure consistent string conversion
      return await sha256(input + round.toString().repeat(round + 1));
      
    case 4: // Rotate by round number - use floor for consistent integer division
      const rotation = Math.floor((round + 1) * 3) % input.length;
      return input.substring(rotation) + input.substring(0, rotation);
      
    default:
      return input;
  }
}

// SHA-256 implementation with consistent encoding
async function sha256(message) {
  // Always convert input to string with consistent encoding
  const utf8Message = String(message);
  
  // Use UTF-8 explicitly to match browser's TextEncoder
  return crypto
    .createHash('sha256')
    .update(utf8Message, 'utf8')
    .digest('hex');
}

/**
 * Evaluates WebGL fingerprinting test results to detect bots and headless browsers
 * @param {Object} result - Client test result with WebGL data
 * @returns {Object} Evaluation results
 */
async function evaluateWebglFingerprinting(result) {
  console.log('Evaluating WebGL fingerprinting result:', result);
  
  try {
    // Check if result is valid
    if (!result || result.error) {
      return {
        valid: false,
        botProbability: 0.9,
        confidence: 0.8,
        details: {
          error: result?.error || 'Invalid test result'
        }
      };
    }
    
    // 1. Check for basic WebGL support - absence is highly suspicious
    const hasWebGL = result.webglSupport && (result.webglSupport.webgl1 || result.webglSupport.webgl2);
    
    // 2. Check for renderer info - missing or suspicious values indicate possible headless browser
    const rendererInfo = result.rendererInfo || {};
    const hasValidRenderer = rendererInfo.renderer && 
                            rendererInfo.vendor &&
                            !isHeadlessRenderer(rendererInfo.renderer);
    
    // 3. Check for anomalies reported by the client
    const anomaliesFound = (result.anomalies || []).length > 0;
    
    // 4. Check consistency tests that verify WebGL behavior matches reported capabilities
    const consistencyTests = result.consistencyTests || {};
    const passedConsistencyTests = consistencyTests.textureSizeConsistent !== false && 
                                  consistencyTests.textureAllocationConsistent !== false;
    
    // 5. Check performance metrics to identify emulated or throttled WebGL
    const perfMetrics = result.performanceMetrics || {};
    const suspiciousPerformance = perfMetrics.textureCreationTime < 5 || 
                                perfMetrics.drawCallsOverhead < 10 || 
                                perfMetrics.drawCallsOverhead > 2000;
    
    // 6. Check rendering tests - look for missing or unusual rendering results
    const renderingTests = result.renderingTests || {};
    const hasValidRendering = renderingTests.run_0 && 
                            renderingTests.run_1 && 
                            Object.keys(renderingTests.run_0.samples || {}).length > 0;
    
    // 7. Check for fingerprint - should have a valid hash
    const hasFingerprint = result.fingerprint && 
                          result.fingerprint.length === 8;
                          
    // 8. Look for suspicious extension patterns
    const missingCriticalExtensions = (result.anomalies || []).includes('missing_critical_extensions');
    
    // 9. Check for shader compilation failures
    const shaderCompilationIssues = (result.anomalies || []).includes('vertex_shader_compilation_failed') ||
                                  (result.anomalies || []).includes('fragment_shader_compilation_failed');
      
    // 10. Check for typical headless browser GPU info
    const isHeadlessBrowser = isProbablyHeadlessBrowser(result);
    
    // Calculate bot probability by combining signals
    let botProbability = 0.1; // Start with low probability
    
    // Heavy signals (strong indicators)
    if (!hasWebGL) botProbability += 0.5;
    if (!hasValidRenderer) botProbability += 0.4;
    if (isHeadlessBrowser) botProbability += 0.4;
    if (shaderCompilationIssues) botProbability += 0.3;
    
    // Medium signals
    if (anomaliesFound) botProbability += 0.2;
    if (!passedConsistencyTests) botProbability += 0.2;
    if (suspiciousPerformance) botProbability += 0.2;
    if (!hasValidRendering) botProbability += 0.2;
    
    // Light signals
    if (missingCriticalExtensions) botProbability += 0.1;
    if (!hasFingerprint) botProbability += 0.1;
    
    // Cap probability between 0 and 1
    botProbability = Math.min(Math.max(botProbability, 0), 1);
    
    // Calculate confidence based on available signals
    let confidence = 0.7; // Base confidence
    
    // Higher confidence with more data points
    if (hasWebGL) confidence += 0.1;
    if (hasValidRenderer) confidence += 0.05;
    if (hasFingerprint) confidence += 0.05;
    if (hasValidRendering) confidence += 0.1;
    
    // Lower confidence with conflicting signals
    if (hasWebGL && (!hasValidRenderer || !hasValidRendering)) confidence -= 0.1;
    if (hasValidRenderer && anomaliesFound) confidence -= 0.05;
    
    // Cap confidence between 0 and 1
    confidence = Math.min(Math.max(confidence, 0), 1);
    
    return {
      valid: botProbability < 0.6, // Consider valid if bot probability is low
      botProbability,
      confidence,
      details: {
        hasWebGL,
        hasValidRenderer,
        passedConsistencyTests,
        suspiciousPerformance,
        hasValidRendering,
        hasFingerprint,
        anomaliesFound,
        anomalies: result.anomalies || [],
        isHeadlessBrowser,
        rendererInfo: rendererInfo,
        renderingFingerprint: result.fingerprint || "missing",
        shaderCompilationIssues
      }
    };
  } catch (error) {
    console.error('Error evaluating WebGL fingerprinting:', error);
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

/**
 * Checks if the renderer string matches known headless/bot renderers
 */
function isHeadlessRenderer(renderer) {
  if (!renderer) return true;
  
  const headlessSignals = [
    'headless',
    'virtual',
    'swiftshader',
    'llvmpipe',
    'software rasterizer',
    'software implementation',
    'indirectx',
    'google swiftshader',
    'microsoft basic render driver',
    'virgl',
    'gdi generic'
  ];
  
  return headlessSignals.some(signal => 
    renderer.toLowerCase().includes(signal)
  );
}

/**
 * Performs comprehensive analysis to detect headless browsers
 */
function isProbablyHeadlessBrowser(result) {
  // Get renderer and vendor info
  const renderer = (result?.rendererInfo?.renderer || '').toLowerCase();
  const vendor = (result?.rendererInfo?.vendor || '').toLowerCase();
  
  // Check for specific headless renderer patterns
  if (isHeadlessRenderer(renderer)) return true;
  
  // Check for missing or incomplete WebGL support
  if (!result.webglSupport?.webgl1) return true;
  
  // Look for other headless indicators
  const headlessIndicators = [
    // No extensions at all
    result.extensions && result.extensions.length === 0,
    
    // Multiple anomalies
    result.anomalies && result.anomalies.length > 2,
    
    // Failed texture creation
    result.anomalies && result.anomalies.includes('texture_allocation_failed'),
    
    // Suspicious performance metrics (too fast or non-existent)
    result.performanceMetrics?.textureCreationTime < 2,
    result.performanceMetrics?.drawCallsOverhead < 5,
    
    // Failed rendering tests
    result.anomalies && result.anomalies.includes('rendering_test_error'),
    
    // Shader compilation issues (common in headless environments)
    result.anomalies && 
    (result.anomalies.includes('vertex_shader_compilation_failed') || 
      result.anomalies.includes('fragment_shader_compilation_failed')),
    
    // Generic or standard strings (often used in emulators)
    vendor === 'unknown' || vendor === 'generic' || vendor === '',
    renderer === 'unknown' || renderer === 'generic' || renderer === ''
  ];
  
  // If several indicators are present, likely headless
  return headlessIndicators.filter(Boolean).length >= 2;
}

module.exports = { evaluateTokenVerification, evaluateWebglFingerprinting };