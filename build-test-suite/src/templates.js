const tokenTests = {
  category: "tokenTests",
  variations: [
    {
      id: "token_verification",
      description: "Performs verification of the challenge token",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Extract required data from challenge
          const token = ctx.token || "";
          const timestamp = ctx.timestamp || 0;
          const challengeId = ctx.id || "";
          
          // Suite-specific transformation seed (static for this suite)
          const TRANSFORM_SEED = PARAM_TRANSFORM_SEED;
          
          // Start time measurement
          const startTime = performance.now();
          
          // Phase 1: Initial hash of token with challenge data
          let digest = await sha256(token + challengeId + timestamp);
          
          // Phase 2: Suite-specific transformation
          digest = await performSuiteTransform(digest, TRANSFORM_SEED);
          
          // Phase 3: Multiple rounds of computation
          // The number of rounds is determined by the first byte of the transform seed
          const rounds = (parseInt(TRANSFORM_SEED.substring(0, 2), 16) % 7) + 3; // 3-10 rounds
          
          for (let i = 0; i < rounds; i++) {
            // Use digest with round number for unique per-round hashing
            digest = await sha256(digest + (i.toString()) + token.substring(0, 8));
            
            // Apply additional transformations based on round number
            digest = await applyRoundTransformation(digest, i, TRANSFORM_SEED);
          }
          
          // Calculate completion time
          const duration = performance.now() - startTime;
          
          // Return verification result with minimal data
          return {
            tokenHash: digest.substring(0, 16), // Truncated hash value
            duration: duration,
            rounds: rounds,
            processedAt: Date.now()
          };
        } catch (error) {
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
        
        // Round-specific transformation function
        async function applyRoundTransformation(input, round, seed) {
          // Select transformation based on round number and seed
          const transformType = (parseInt(seed.substring(round % seed.length, round % seed.length + 2), 16) + round) % 5;
          
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
  variations: []
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