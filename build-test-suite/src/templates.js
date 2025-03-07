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