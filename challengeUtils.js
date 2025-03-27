const { v4: uuidv4 } = require('uuid');
const { evaluateTokenVerification, evaluateWebglFingerprinting } = require('./verifyUtils');

const MAX_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_CHALLENGE_AGE, 5 * 60 * 1000);
const CHALLENGE_POW_DIFFICULTY = parseEnvNumber(process.env.CHALLENGE_POW_DIFFICULTY, 2);
const INTERACTIVE_CHALLENGE_THRESHOLD = parseEnvNumber(process.env.INTERACTIVE_CHALLENGE_THRESHOLD, 0.6);
const MAX_INTERACTIVE_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_INTERACTIVE_CHALLENGE_AGE, 3 * 60 * 1000);

function parseEnvNumber(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    
    const num = Number(value);
    return !isNaN(num) ? num : defaultValue;
}

class PseudoRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }
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
 * @param {Object} suiteData - Test suite data
 * @param {number} botProbability - Bot probability assessment from automatic tests
 * @returns {Object} Interactive challenge configuration (sent to client)
 */
function createInteractiveChallenge(challenge, suiteData, botProbability) {
  // Select appropriate interactive test and generate its parameters
  const selectedTestConfig = selectInteractiveTest(botProbability, challenge, suiteData);
  
  // Generate a unique ID for this interactive challenge instance
  const interactiveChallengeId = uuidv4();
  
  // Create the interactive challenge configuration to be sent to the client
  // This includes the test ID (from the suite) and the client-specific parameters
  const interactiveChallenge = {
    id: interactiveChallengeId,
    parentChallengeId: challenge.id,
    timestamp: Date.now(),
    expiry: Date.now() + MAX_INTERACTIVE_CHALLENGE_AGE,
    ...selectedTestConfig
  };
  
  console.log(`Created interactive challenge ${interactiveChallengeId} using test ${selectedTestConfig.testId}`);
  return interactiveChallenge;
}

/**
 * Selects an appropriate interactive test, generates its parameters, and returns the configuration.
 * @param {number} botProbability - Bot probability from automatic tests (0-1)
 * @param {Object} challenge - The original challenge object (contains challengeId, suiteId)
 * @param {Object} suiteData - Test suite data (contains suiteSeed, interactiveTests list)
 * @returns {Object} Object containing { testId, originalTestId, clientParams, verificationParams }
 */
function selectInteractiveTest(botProbability, challenge, suiteData) {
  // 1. Select an interactive test from the suite
  const availableInteractiveTests = suiteData.interactiveTests;
  
  if (!availableInteractiveTests || availableInteractiveTests.length === 0) {
    throw new CaptchaError('NO_INTERACTIVE_TESTS_IN_SUITE', {
      message: `No interactive tests found in suite ${suiteData.suiteId}`,
      details: { suiteId: suiteData.suiteId }
    });
  }
  
  // Simple selection: Pick a random test from the available ones in the suite
  // Use a deterministic seed based on challenge ID and suite seed for reproducibility
  const selectionSeed = challenge.id + suiteData.suiteSeed;
  const seedInt = parseInt(crypto.createHash('sha256').update(selectionSeed).digest('hex').substring(0, 8), 16);
  const rng = new PseudoRandom(seedInt); // Assuming PseudoRandom class is defined elsewhere or imported
  const selectedTestIndex = Math.floor(rng.next() * availableInteractiveTests.length);
  const selectedTestInfo = availableInteractiveTests[selectedTestIndex]; // This is the info from suiteData.json

  // Find the actual test module implementation using the originalId
  const testModule = captchaTests.getTestById(selectedTestInfo.originalId);
  if (!testModule) {
      throw new CaptchaError('INTERACTIVE_TEST_MODULE_NOT_FOUND', {
          message: `Test module implementation not found for ID: ${selectedTestInfo.originalId}`,
          details: { testId: selectedTestInfo.originalId }
      });
  }

  // 2. Call the test's generateChallengeParams function
  const targetDifficulty = Math.min(Math.floor(botProbability * 5) + 1, 5); // Difficulty 1-5 based on probability
  
  const options = {
    challengeId: challenge.id, // Pass the original challenge ID
    difficultyLevel: targetDifficulty,
    suiteId: suiteData.suiteId,
    suiteData: suiteData // Pass the full suite data for context if needed
  };
  
  // Generate the parameters using the test module's function
  const generatedParams = testModule.generateChallengeParams(options);

  // 3. Return the test ID (from the suite instance) and the generated params
  return {
    testId: selectedTestInfo.id, // Use the unique ID assigned in the suite
    originalTestId: selectedTestInfo.originalId, // Keep original ID for reference
    clientParams: generatedParams.clientParams,
    verificationParams: generatedParams.verificationParams // Keep verification params separate
  };
}

function getRequestFingerprint(request) {
  // To be implemented
}

function getToken(){
  // TO-DO create token
  return 'token-1234';
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
    // Verify challenge is still valid
    verifyExpiration(challenge);
    
    // Verify proof of work
    verifyProofOfWork(submission);
    
    // Evaluate automatic test results
    const testEvaluations = await evaluateAutomaticTests(submission, challenge, suiteData);
    
    // Calculate combined bot probability
    const totalBotProbability = calculateCombinedBotProbability(testEvaluations);
    console.log(`Total bot probability from automatic tests: ${totalBotProbability.toFixed(3)}`);
    
    // Return results based on three possible scenarios
    return determineVerificationResult(submission, challenge, suiteData, totalBotProbability, testEvaluations);
  } catch (error) {
    return handleVerificationError(error);
  }
}

/**
 * Verifies if challenge has not expired
 */
function verifyExpiration(challenge) {
  console.log('Verifying challenge expiration...');
  const maxAge = MAX_CHALLENGE_AGE;
  const challengeAge = Date.now() - challenge.timestamp;
  const challengeExpired = challengeAge > maxAge;
  
  if (challengeExpired) {
    throw new CaptchaError('CHALLENGE_EXPIRED', { message: 'Challenge expired', details: { challenge, maxAge, challengeAge, challengeExpired }} );
  }
}

/**
 * Verifies the proof of work result
 */
function verifyProofOfWork(submission) {
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
}

/**
 * Evaluates all automatic tests in the submission using the test interface
 * @param {Object} submission - User submission data
 * @param {Object} challenge - Challenge data sent to client
 * @param {Object} suiteData - Suite configuration data
 * @returns {Map} Map of test evaluations keyed by original test ID
 */
async function evaluateAutomaticTests(submission, challenge, suiteData) {
  console.log('Evaluating automatic test results using test interface...');
  const testEvaluations = new Map();
  
  // Filter for real automatic tests (not dummy tests)
  const realAutomaticTests = suiteData.tests.filter(test => test.isRealTest && !test.isInteractive);

  for (const testInfo of realAutomaticTests) {
    console.log(`Evaluating test ${testInfo.originalId} (ID: ${testInfo.id})...`);
    
    // Find the actual test module implementation
    const testModule = captchaTests.getTestById(testInfo.originalId);
    if (!testModule) {
      throw new CaptchaError('TEST_MODULE_NOT_FOUND', {
        message: `Test module implementation not found for ID: ${testInfo.originalId}`,
        details: { testId: testInfo.originalId }
      });
    }

    // Check if the verifyResult function exists
    if (typeof testModule.verifyResult !== 'function') {
        throw new CaptchaError('VERIFY_FUNCTION_MISSING', {
            message: `verifyResult function not found for test module: ${testInfo.originalId}`,
            details: { testId: testInfo.originalId }
        });
    }

    // Check if the test result exists in the submission
    if (!submission.challengeSolution?.testResults || 
        !submission.challengeSolution.testResults.hasOwnProperty(testInfo.id)) {
      throw new CaptchaError('MISSING_TEST_RESULT', {
        message: `Missing test result for test ${testInfo.originalId} (ID: ${testInfo.id})`,
        details: {
          testId: testInfo.id,
          originalTestId: testInfo.originalId,
          availableResults: Object.keys(submission.challengeSolution?.testResults || {})
        }
      });
    }

    const result = submission.challengeSolution.testResults[testInfo.id];
    
    // Retrieve the parameters used for this specific test instance from suiteData
    // These act as the 'verificationParams' for automatic tests in this context
    const verificationParams = testInfo.paramValues || {}; 

    try {
      // Call the test module's verifyResult function
      // Following the interface: verifyResult(result, challenge, verificationParams)
      const evaluation = await testModule.verifyResult(result, challenge, verificationParams);
      
      // Store the evaluation result using the original test ID as the key
      testEvaluations.set(testInfo.originalId, evaluation);
      console.log(`Test ${testInfo.originalId} evaluation complete. Valid: ${evaluation.valid}, BotProb: ${evaluation.botProbability?.toFixed(3)}`);

    } catch (error) {
        console.error(`Error verifying test ${testInfo.originalId}:`, error);
        // Store an error evaluation if verification fails
        testEvaluations.set(testInfo.originalId, {
            valid: false,
            botProbability: 0.95, // High probability on error
            confidence: 0.5,
            details: {
                error: `Verification failed: ${error.message}`
            }
        });
    }
  }
  
  return testEvaluations;
}

/**
 * Calculate weighted average bot probability from all tests
 */
function calculateCombinedBotProbability(testEvaluations) {
  let totalConfidence = 0;
  let weightedBotProbabilitySum = 0;
  
  testEvaluations.forEach((evaluation) => {
    if (evaluation.botProbability !== undefined && evaluation.confidence !== undefined) {
      weightedBotProbabilitySum += evaluation.botProbability * evaluation.confidence;
      totalConfidence += evaluation.confidence;
    }
  });
  
  // Calculate weighted average bot probability
  return totalConfidence > 0 ? weightedBotProbabilitySum / totalConfidence : 0;
}

/**
 * Determine the verification result based on the bot probability and submission
 */
function determineVerificationResult(submission, challenge, suiteData, totalBotProbability, testEvaluations) {
  // Base result structure with automatic test results
  const baseResult = {
    botProbability: totalBotProbability,
    details: {
      automaticTestResults: Object.fromEntries(testEvaluations)
    }
  };

  // CASE 1: Interactive challenge already submitted
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
    
    return {
      ...baseResult,
      valid: finalBotProbability < 0.4, // Threshold for accepting as human
      botProbability: finalBotProbability,
      requiresInteractiveChallenge: false, // Already completed
      details: {
        ...baseResult.details,
        interactiveTestResult: interactiveResult
      }
    };
  }
  
  // CASE 2: Bot probability exceeds threshold, need interactive challenge
  if (totalBotProbability >= INTERACTIVE_CHALLENGE_THRESHOLD) {
    console.log('Bot probability threshold exceeded, interactive challenge required');
    
    // Create interactive challenge configuration
    const interactiveChallenge = createInteractiveChallenge(
      challenge,
      suiteData,
      totalBotProbability
    );
    
    return {
      ...baseResult,
      valid: false,
      requiresInteractiveChallenge: true,
      interactiveChallenge: interactiveChallenge
    };
  }
  
  // CASE 3: Bot probability below threshold, verification successful
  return {
    ...baseResult,
    valid: true,
    requiresInteractiveChallenge: false
  };
}

/**
 * Handle verification errors with consistent response format
 */
function handleVerificationError(error) {
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
  verifySubmission
};