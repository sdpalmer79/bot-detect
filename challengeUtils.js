const { v4: uuidv4 } = require('uuid');
const { evaluateTokenVerification, evaluateWebglFingerprinting } = require('./verifyUtils');

const MAX_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_CHALLENGE_AGE, 5 * 60 * 1000);
const CHALLENGE_POW_DIFFICULTY = parseEnvNumber(process.env.CHALLENGE_POW_DIFFICULTY, 2);
// Threshold for triggering interactive verification (0.0-1.0)
const INTERACTIVE_CHALLENGE_THRESHOLD = parseEnvNumber(process.env.INTERACTIVE_CHALLENGE_THRESHOLD, 0.6);
const MAX_INTERACTIVE_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_INTERACTIVE_CHALLENGE_AGE, 3 * 60 * 1000);

function parseEnvNumber(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    
    const num = Number(value);
    return !isNaN(num) ? num : defaultValue;
}

function assignTestSuite() {
    // To be implemented
}

function createChallengeForRequest(suiteData, request) {
  // Create challenge id when saving to db
  const challengeId = uuidv4();  
  const challenge = {
    id: challengeId,
    suiteId: suiteData.suiteId,
    suiteUrl: `/suite/${suiteData.suiteId}`,
    timestamp: Date.now(),
    token: getToken(),
    powDifficulty: CHALLENGE_POW_DIFFICULTY,
    powPrefix: `${challengeId.substring(0, 8)}-${suiteData.suiteId.substring(0, 8)}`,
    expiry: Date.now() + MAX_CHALLENGE_AGE // 5 minutes
  };
  return challenge;
}

/**
 * Creates an interactive challenge configuration based on the automatic test results
 * @param {Object} challenge - Original challenge data
 * @param {number} botProbability - Bot probability assessment from automatic tests
 * @returns {Object} Interactive challenge configuration
 */
function createInteractiveChallenge(challenge, botProbability) {
  // Calculate difficulty level based on bot probability (1-10 scale)
  // Higher bot probability = harder challenge
  const difficultyLevel = Math.min(Math.floor(botProbability * 10) + 1, 10);
  
  // Select appropriate challenge type based on bot probability
  const challengeType = selectChallengeType(botProbability);
  
  // Create the interactive challenge configuration
  const interactiveChallenge = {
    id: `${challenge.id}-interactive`,
    parentChallengeId: challenge.id,
    timestamp: Date.now(),
    expiry: Date.now() + MAX_INTERACTIVE_CHALLENGE_AGE,
    botProbability: botProbability,
    
    // Parameters used by the client to render the appropriate challenge
    parameters: {
      challenge: {
        id: challenge.id,
        timestamp: Date.now()
      },
      difficulty: difficultyLevel,
      maxAttempts: 3,
      type: challengeType // Challenge type as selected by our function
    }
  };
  
  return interactiveChallenge;
}

/**
 * Selects an appropriate challenge type based on bot probability
 * @param {number} botProbability - Bot probability from automatic tests (0-1)
 * @returns {string} Challenge type identifier
 */
function selectChallengeType(botProbability) {
  // Available challenge types ordered by increasing complexity
  const availableChallengeTypes = [
    "pattern_completion",   // Currently fully implemented
    "image_selection",      // Will be implemented next
    "object_orientation"    // More complex, to be implemented later
  ];
  
  // For very high bot probability, use the most complex challenge available
  if (botProbability > 0.85) {
    // If object_orientation is implemented, use that for high-risk sessions
    if (isImplemented("object_orientation")) {
      return "object_orientation";
    }
  } 
  
  // For medium-high probability, use image selection if available
  if (botProbability > 0.7) {
    if (isImplemented("image_selection")) {
      return "image_selection";
    }
  }
  
  // Default to pattern completion which is known to be implemented
  return "pattern_completion";
}

/**
 * Helper function to check if a challenge type is implemented
 * This would ideally check a configuration or the filesystem
 * For now, only pattern_completion is considered implemented
 */
function isImplemented(challengeType) {
  // For now, only pattern_completion is fully implemented
  // This would ideally check for the existence of modules or configuration
  return challengeType === "pattern_completion";
}

function getRequestFingerprint(request) {
  // To be implemented
}

function getToken(){
  // TO-DO create token
  return 'token-1234';
}

/**
 * Checks challenge expiration
 * @param {Object} challenge - Challenge data sent to client
 * @returns {Object} Expiration status information
 */
function checkChallengeExpiration(challenge) {
  const maxAge = MAX_CHALLENGE_AGE;
  const challengeAge = Date.now() - challenge.timestamp;
  const challengeExpired = challengeAge > maxAge;
  
  return {
    valid: !challengeExpired,
    challengeAge,
    maxValidAge: maxAge,
    expiryTime: challenge.timestamp + maxAge,
    remainingTime: Math.max(0, (challenge.timestamp + maxAge) - Date.now())
  };
}

/**
 * Verifies CAPTCHA submission results
 * @param {Object} submission - User submission data
 * @param {Object} challenge - Challenge data sent to client
 * @param {Object} suiteData - Suite configuration data
 * @returns {Object} Verification results with standardized format
 */
async function verifySubmission(submission, challenge, suiteData) {
  try {
    // Check challenge expiration
    const expirationCheck = checkChallengeExpiration(challenge);
    if (!expirationCheck.valid) {
      throw new CaptchaError('CHALLENGE_EXPIRED', { message: 'Challenge expired:', expirationCheck});
    }

    console.log('Verifying proof of work...');
    const powValid = submission.challengeSolution.powResult && 
                  submission.challengeSolution.powResult.hash && 
                  submission.challengeSolution.powResult.hash.startsWith('00');

    if (!powValid) {
      throw new CaptchaError('INVALID_PROOF_OF_WORK', {
        message: 'Invalid proof of work',
        details: { powResult: submission.powResult }
      });
    }

    console.log('Evaluating automatic test results...');
    const testEvaluations = new Map();
    
    // Verify automatic tests first
    for (const test of suiteData.tests.filter(test => test.isRealTest)) {
      console.log(`Evaluating test ${test.originalId}...`);
      
      // Check if the test result exists
      if (!submission.challengeSolution.testResults || 
          !submission.challengeSolution.testResults.hasOwnProperty(test.id)) {
        throw new CaptchaError('MISSING_TEST_RESULT', {
          message: `Missing test result for test ${test.originalId} (ID: ${test.id})`,
          details: {
            testId: test.id,
            originalTestId: test.originalId,
            availableResults: Object.keys(submission.challengeSolution.testResults || {})
          }
        });
      }

      const result = submission.challengeSolution.testResults[test.id];

      switch (test.originalId) {
        case 'token_verification':
          testEvaluations.set('token_verification', await evaluateTokenVerification(result, challenge, suiteData));
          break;
        case 'webgl_fingerprinting':
          testEvaluations.set('webgl_fingerprinting', await evaluateWebglFingerprinting(result));
          break;
        // Additional test evaluations can be added here
        default:
          console.log(`Unknown test type: ${test.originalId}`);
      }
    }

    // Calculate combined bot probability from all automatic tests
    let totalBotProbability = 0;
    let totalConfidence = 0;
    let weightedBotProbabilitySum = 0;
    
    testEvaluations.forEach((evaluation) => {
      if (evaluation.botProbability !== undefined && evaluation.confidence !== undefined) {
        weightedBotProbabilitySum += evaluation.botProbability * evaluation.confidence;
        totalConfidence += evaluation.confidence;
      }
    });
    
    // Calculate weighted average bot probability
    totalBotProbability = totalConfidence > 0 ? weightedBotProbabilitySum / totalConfidence : 0;

    console.log(`Total bot probability from automatic tests: ${totalBotProbability.toFixed(3)}`);

    // Check if interactive challenge has been submitted
    if (submission.interactiveChallenge) {
      console.log('Interactive challenge solution submitted, evaluating...');
      
      // Evaluate the interactive challenge
      const interactiveResult = evaluateInteractiveChallenge(
        submission.interactiveChallenge,
        challenge
      );
      
      // Adjust final bot probability based on interactive challenge results
      const finalBotProbability = calculateFinalBotProbability(
        totalBotProbability,
        interactiveResult
      );
      
      // Decide if the verification is valid based on final probability
      const valid = finalBotProbability < 0.4; // Threshold for accepting as human
      
      return {
        valid,
        botProbability: finalBotProbability,
        requiresInteractiveChallenge: false, // Already completed
        details: {
          automaticTestResults: Object.fromEntries(testEvaluations),
          interactiveTestResult: interactiveResult
        }
      };
    }
    
    // Check if bot probability exceeds threshold to trigger interactive challenge
    if (totalBotProbability >= INTERACTIVE_CHALLENGE_THRESHOLD) {
      console.log('Bot probability threshold exceeded, interactive challenge required');
      
      // Create interactive challenge configuration
      const interactiveChallenge = createInteractiveChallenge(
        challenge,
        totalBotProbability
      );
      
      return {
        valid: false,
        botProbability: totalBotProbability,
        requiresInteractiveChallenge: true,
        interactiveChallenge: interactiveChallenge,
        details: {
          automaticTestResults: Object.fromEntries(testEvaluations)
        }
      };
    }
    
    // If bot probability is below threshold, verification is successful without interactive challenge
    return {
      valid: true,
      botProbability: totalBotProbability,
      requiresInteractiveChallenge: false,
      details: {
        automaticTestResults: Object.fromEntries(testEvaluations)
      }
    };
  } catch (error) {
    if (error instanceof CaptchaError) {
      // Log error
      console.error('Verification error:', error);
      
      // Return structured error response for known failure cases
      return {
        valid: false,
        errorCode: error.code,
        message: error.message,
        details: error.details
      };
    }
    
    // For unexpected errors, return minimal information
    console.error('Unexpected verification error:', error);
    return {
      valid: false,
      errorCode: 'VERIFICATION_ERROR',
      message: 'An unexpected error occurred during verification'
    };
  }
}

/**
 * Evaluates an interactive challenge solution
 * @param {Object} interactiveChallenge - Interactive challenge solution
 * @param {Object} originalChallenge - Original challenge data
 * @returns {Object} Evaluation results for the interactive challenge
 */
function evaluateInteractiveChallenge(interactiveChallenge, originalChallenge) {
  // Check if the challenge was successful
  const success = interactiveChallenge.success === true;
  
  // Calculate bot probability based on interaction patterns
  let botProbability = 0.5; // Default starting value
  
  // Check if the correct solution was selected
  if (success) {
    botProbability -= 0.3; // Reduce probability for correct solution
  } else {
    botProbability += 0.3; // Increase probability for incorrect solution
  }
  
  // Analyze interaction data for bot patterns
  if (interactiveChallenge.userInteractions && 
      interactiveChallenge.userInteractions.length > 0) {
    
    // Check for natural mouse movement patterns
    const mouseMovements = interactiveChallenge.userInteractions.filter(
      i => i.type === 'mousemove'
    );
    
    // Human interactions typically have many mouse movements
    if (mouseMovements.length < 5) {
      botProbability += 0.2; // Few mouse movements suggest automation
    } else {
      botProbability -= 0.1; // Natural amount of mouse movements
    }
    
    // Check for hover behavior before selection
    const hasHoverBeforeSelection = mouseMovements.some(
      m => m.timestamp < interactiveChallenge.completionTime - 500
    );
    
    if (hasHoverBeforeSelection) {
      botProbability -= 0.1; // Hovering is a natural human behavior
    }
    
    // Check completion time - too fast suggests automation
    if (interactiveChallenge.completionTime < 1000) {
      botProbability += 0.2; // Too fast, likely bot
    } else if (interactiveChallenge.completionTime > 10000) {
      botProbability += 0.1; // Too slow, could be a bot taking time deliberately
    } else {
      botProbability -= 0.1; // Natural time range
    }
  } else {
    // No interaction data is highly suspicious
    botProbability += 0.4;
  }
  
  // Cap probability between 0 and 1
  botProbability = Math.min(Math.max(botProbability, 0), 1);
  
  return {
    success,
    botProbability,
    confidence: 0.8, // Interactive challenges have high confidence
    interactionQuality: calculateInteractionQuality(interactiveChallenge),
    completionTime: interactiveChallenge.completionTime
  };
}

/**
 * Calculates the quality of user interactions
 * @param {Object} interactiveChallenge - Interactive challenge data
 * @returns {number} Interaction quality score (0-1)
 */
function calculateInteractionQuality(interactiveChallenge) {
  let quality = 0.5; // Default score
  
  // Analyze mouse movements for natural patterns
  if (interactiveChallenge.userInteractions) {
    const movements = interactiveChallenge.userInteractions.filter(i => i.type === 'mousemove');
    
    if (movements.length > 10) {
      quality += 0.2; // Many movements suggest human interaction
      
      // Analyze movement patterns
      if (movements.length >= 3) {
        // Check for natural acceleration/deceleration patterns
        let naturalPatterns = 0;
        let straightLinePatterns = 0;
        
        for (let i = 2; i < movements.length; i++) {
          const p1 = movements[i-2].data;
          const p2 = movements[i-1].data;
          const p3 = movements[i].data;
          
          if (p1 && p2 && p3) {
            // Calculate direction changes
            const vector1 = { x: p2.x - p1.x, y: p2.y - p1.y };
            const vector2 = { x: p3.x - p2.x, y: p3.y - p2.y };
            
            // Calculate angle between vectors
            const dot = vector1.x * vector2.x + vector1.y * vector2.y;
            const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
            const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
            
            if (mag1 > 0 && mag2 > 0) {
              const angle = Math.acos(dot / (mag1 * mag2));
              
              // Check for straight line movement (bot-like)
              if (Math.abs(angle) < 0.1) {
                straightLinePatterns++;
              }
              
              // Check for natural curves
              if (angle > 0.1 && angle < Math.PI / 4) {
                naturalPatterns++;
              }
            }
          }
        }
        
        // Calculate ratios of patterns
        const totalPatterns = movements.length - 2;
        const straightLineRatio = straightLinePatterns / totalPatterns;
        const naturalRatio = naturalPatterns / totalPatterns;
        
        if (straightLineRatio > 0.7) {
          quality -= 0.3; // Too many straight lines
        }
        
        if (naturalRatio > 0.3) {
          quality += 0.2; // Good amount of natural curves
        }
      }
    }
  }
  
  // Cap between 0 and 1
  return Math.min(Math.max(quality, 0), 1);
}

/**
 * Combines automatic and interactive test results to get final bot probability
 * @param {number} automaticProbability - Bot probability from automatic tests
 * @param {Object} interactiveResult - Results from interactive challenge
 * @returns {number} Final bot probability assessment
 */
function calculateFinalBotProbability(automaticProbability, interactiveResult) {
  // Weight the interactive challenge more heavily
  const AUTOMATIC_WEIGHT = 0.4;
  const INTERACTIVE_WEIGHT = 0.6;
  
  const finalProbability = 
    (automaticProbability * AUTOMATIC_WEIGHT) + 
    (interactiveResult.botProbability * INTERACTIVE_WEIGHT);
    
  return Math.min(Math.max(finalProbability, 0), 1);
}

// Custom error class for CAPTCHA validation
class CaptchaError extends Error {
  constructor(code, {message, details}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

module.exports = { 
  createChallengeForRequest, 
  verifySubmission,
  createInteractiveChallenge,
  checkChallengeExpiration
};