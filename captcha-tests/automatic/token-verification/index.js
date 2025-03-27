/**
 * Token verification test implementation
 * 
 * This test verifies that a client can correctly hash a challenge token using
 * a deterministic algorithm, which proves client integrity and code execution.
 */

const sharedCode = require('@sdpalmer79/captcha-shared-code');
const crypto = require('crypto');

/**
 * Token verification test module implementing the standard test interface
 */
module.exports = {
  /**
   * Metadata about this test
   */
  meta: {
    id: "token_verification",
    name: "Token Verification Test",
    type: "automatic",
    category: "cryptographic"
  },
  
  /**
   * Returns client-side code with parameter placeholders
   * @param {string} [seed] - Seed for selecting test variation deterministically
   * @returns {string} JavaScript code with parameter placeholders
   */
  getClientCode(seed) {
    // Select variation based on seed
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
        id: "token_verification_standard",
        description: "Standard token verification implementation",
        code: `async function TEST_FUNCTION_NAME(ctx) {
          try {
            ${sharedCode.token_verification.calculateTokenHash.toString()}

            // Extract required data from challenge
            const token = ctx.challenge.token || "";
            const timestamp = ctx.challenge.timestamp || 0;
            const challengeId = ctx.challenge.id || "";
            
            // Suite-specific transformation seed (replaced at build time)
            const transformSeed = PARAM_TRANSFORM_SEED;
            
            // Start time measurement
            const startTime = performance.now();
            
            // Calculate hash
            const result = await calculateTokenHash(token, challengeId, timestamp, transformSeed);
            
            // Calculate completion time
            const duration = performance.now() - startTime;
            
            // Return verification result
            return {
              ...result,
              duration: duration,
              processedAt: Date.now()
            };
          } catch (error) {
            return {
              error: "Token verification failed",
              errorMessage: error.message
            };
          }
        }`
      },
      {
        id: "token_verification_with_timing",
        description: "Token verification with enhanced timing metrics",
        code: `async function TEST_FUNCTION_NAME(ctx) {
          try {
            ${sharedCode.token_verification.calculateTokenHash.toString()}

            // Extract required data from challenge
            const token = ctx.challenge.token || "";
            const timestamp = ctx.challenge.timestamp || 0;
            const challengeId = ctx.challenge.id || "";
            
            // Suite-specific transformation seed (replaced at build time)
            const transformSeed = PARAM_TRANSFORM_SEED;
            
            // Enhanced timing measurements
            const timings = {
              start: performance.now(),
              preprocessing: 0,
              hashing: 0,
              postprocessing: 0,
              total: 0
            };
            
            // Preprocessing
            const preStart = performance.now();
            const inputs = {
              token: String(token),
              challengeId: String(challengeId),
              timestamp: Number(timestamp),
              transformSeed: String(transformSeed)
            };
            timings.preprocessing = performance.now() - preStart;
            
            // Hash calculation
            const hashStart = performance.now();
            const result = await calculateTokenHash(
              inputs.token, 
              inputs.challengeId, 
              inputs.timestamp, 
              inputs.transformSeed
            );
            timings.hashing = performance.now() - hashStart;
            
            // Post-processing
            const postStart = performance.now();
            const output = { ...result };
            timings.postprocessing = performance.now() - postStart;
            
            // Calculate overall timing
            timings.total = performance.now() - timings.start;
            
            // Return verification result with detailed timings
            return {
              ...output,
              duration: timings.total,
              timingDetails: timings,
              processedAt: Date.now()
            };
          } catch (error) {
            return {
              error: "Token verification failed",
              errorMessage: error.message
            };
          }
        }`
      },
      {
        id: "token_verification_chunked",
        description: "Token verification with chunked processing",
        code: `async function TEST_FUNCTION_NAME(ctx) {
          try {
            // Intentionally not using the shared code directly
            // Instead implementing the algorithm with chunking for verification
            
            // Extract required data from challenge
            const token = ctx.challenge.token || "";
            const timestamp = ctx.challenge.timestamp || 0;
            const challengeId = ctx.challenge.id || "";
            const transformSeed = PARAM_TRANSFORM_SEED;
            
            // Start time measurement
            const startTime = performance.now();
            
            // Create combined input in chunks to simulate more intensive processing
            let combinedInput = '';
            
            // Chunk 1: Add token
            combinedInput += token;
            await new Promise(r => setTimeout(r, 1)); // Tiny delay
            
            // Chunk 2: Add challenge ID
            combinedInput += ':' + challengeId;
            await new Promise(r => setTimeout(r, 1)); // Tiny delay
            
            // Chunk 3: Add timestamp
            combinedInput += ':' + timestamp;
            await new Promise(r => setTimeout(r, 1)); // Tiny delay
            
            // Chunk 4: Add transform seed
            combinedInput += ':' + transformSeed;
            
            // Calculate hash
            let tokenHash;
            try {
              const encoder = new TextEncoder();
              const data = encoder.encode(combinedInput);
              const hashBuffer = await crypto.subtle.digest('SHA-256', data);
              
              // Convert hash to hex string
              tokenHash = Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            } catch (e) {
              // Fallback for environments without crypto.subtle
              // Note: This creates deliberate variation in computation time
              let hash = 0;
              for (let i = 0; i < combinedInput.length; i++) {
                hash = ((hash << 5) - hash) + combinedInput.charCodeAt(i);
                hash |= 0;
              }
              tokenHash = hash.toString(16);
            }
            
            // Calculate completion time
            const duration = performance.now() - startTime;
            
            // Return verification result
            return {
              tokenHash,
              duration,
              implementation: "chunked",
              processedAt: Date.now()
            };
          } catch (error) {
            return {
              error: "Token verification failed",
              errorMessage: error.message
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
    return {
      "PARAM_TRANSFORM_SEED": "SUITE_TRANSFORM_SEED"
    };
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
      const transformSeed = testParams.PARAM_TRANSFORM_SEED;
      
      // Calculate expected tokenHash using the same shared code algorithm
      const expectedResult = sharedCode.token_verification.calculateTokenHash(
        token, challengeId, timestamp, transformSeed
      );
      
      // Compare with received hash
      const hashValid = (result.tokenHash === expectedResult.tokenHash);
      
      // Check timing for anomalies (suspicious if too fast or too slow)
      const executionTime = result.duration;
      const timingNormal = executionTime > 5; // Minimum reasonable time
      const timingSuspicious = executionTime < 10 || executionTime > 5000;
      
      // Detect which variation was used
      const implementation = result.implementation || 
                            (result.timingDetails ? "detailed_timing" : "standard");
      
      // Calculate bot probability
      let botProbability = 0.1; // Start with low probability
      
      if (!hashValid) botProbability += 0.6;
      if (!timingNormal) botProbability += 0.2;
      if (timingSuspicious) botProbability += 0.1;
      
      // Additional checks for timing variation
      if (implementation === "detailed_timing" && result.timingDetails) {
        // Check for suspiciously fast preprocessing or hashing steps
        if (result.timingDetails.preprocessing < 1 || result.timingDetails.hashing < 5) {
          botProbability += 0.1;
        }
        
        // Check for unnatural timing proportions
        const hashingRatio = result.timingDetails.hashing / result.timingDetails.total;
        if (hashingRatio < 0.5 || hashingRatio > 0.99) {
          // Hash computation should take majority but not all of the time
          botProbability += 0.1;
        }
      }
      
      // Cap probability between 0 and 1
      botProbability = Math.min(Math.max(botProbability, 0), 1);
      
      return {
        valid: hashValid && timingNormal,
        botProbability,
        confidence: hashValid ? 0.95 : 0.8,
        details: {
          hashValid,
          timingNormal,
          expectedHashPrefix: expectedResult.tokenHash.substring(0, 16),
          receivedHashPrefix: result.tokenHash?.substring(0, 16),
          processingTime: result.duration,
          implementation,
          timingDetails: result.timingDetails
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