const { v4: uuidv4 } = require('uuid');
const captchaTests = require('./captcha-tests');

const MAX_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_CHALLENGE_AGE, 5 * 60 * 1000);
const CHALLENGE_POW_DIFFICULTY = parseEnvNumber(process.env.CHALLENGE_POW_DIFFICULTY, 2);
const INTERACTIVE_CHALLENGE_THRESHOLD = parseEnvNumber(process.env.INTERACTIVE_CHALLENGE_THRESHOLD, 0.6);
const CHALLENGE_ID_HEADER = 'x-challenge-id';

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

// Custom error class for CAPTCHA validation
class CaptchaError extends Error {
  constructor(code, {message, details}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/**
 * Selects a random test suite from the available suites map.
 * @param {Map<string, Object>} suitesMap - A Map where keys are suite IDs and values are suite data objects.
 * @returns {Object} The selected suite data object.
 * @throws {CaptchaError} If no suites are available in the map.
 */
function assignTestSuite(suitesMap) {
  if (!suitesMap || suitesMap.size === 0) {
      throw new CaptchaError('NO_SUITES_AVAILABLE', {
          message: 'No CAPTCHA test suites are currently loaded or available.',
          details: {}
      });
  }

  // Get an array of suite IDs (keys of the map)
  const suiteIds = Array.from(suitesMap.keys());

  // Select a random index
  const randomIndex = Math.floor(Math.random() * suiteIds.length);
  const selectedSuiteId = suiteIds[randomIndex];

  // Retrieve and return the suite data for the selected ID
  const selectedSuiteData = suitesMap.get(selectedSuiteId);

  if (!selectedSuiteData) {
      // This should ideally not happen if the map is consistent
      throw new CaptchaError('SUITE_DATA_MISSING', {
          message: `Suite data not found for randomly selected ID: ${selectedSuiteId}`,
          details: { selectedSuiteId }
      });
  }

  console.log(`Assigned test suite: ${selectedSuiteId}`);
  return selectedSuiteData;
}

function createChallengeForRequest(suiteData, request) {
  // Use challengeId as the token
  const challengeId = uuidv4(); 
  const challenge = {
    id: challengeId, // This is the token
    suiteId: suiteData.suiteId,
    suiteUrl: `/suite/${suiteData.suiteId}`,
    timestamp: Date.now(),
    powDifficulty: CHALLENGE_POW_DIFFICULTY,
    // Ensure powPrefix uses the generated challengeId
    powPrefix: `${challengeId.substring(0, 8)}-${suiteData.suiteId.substring(0, 8)}`, 
    expiry: Date.now() + MAX_CHALLENGE_AGE // Explicit expiry time
  };
  return challenge;
}

/**
 * Retrieves the challenge ID from request headers and validates the challenge.
 * @param {Object} req - The Express request object.
 * @param {Map<string, Object>} challengeCache - The cache storing active challenges.
 * @returns {Object} The validated challenge object.
 * @throws {CaptchaError} If token is missing, challenge not found, or challenge expired.
 */
function getAndVerifyChallenge(req, challengeCache) {
  // 1. Fetch the token (challenge ID) from the header
  const challengeId = req.headers[CHALLENGE_ID_HEADER];
  
  if (!challengeId) {
    throw new CaptchaError('MISSING_CHALLENGE_ID', {
      message: `Missing challenge ID in header '${CHALLENGE_ID_HEADER}'.`,
      details: { headers: req.headers }
    });
  }
  
  // 2. Fetch the challenge from the cache
  const challenge = challengeCache.get(challengeId);
  
  if (!challenge) {
    throw new CaptchaError('CHALLENGE_NOT_FOUND', {
      message: `Challenge with ID '${challengeId}' not found in cache. It might have expired or never existed.`,
      details: { challengeId }
    });
  }
  
  // 3. Verify that the challenge age has not expired
  const challengeAge = Date.now() - challenge.timestamp;
  const maxAge = challenge.expiry ? (challenge.expiry - challenge.timestamp) : MAX_CHALLENGE_AGE; // Use expiry if available, else default
  
  if (challengeAge > maxAge) {
    // Optionally remove expired challenge from cache
    challengeCache.delete(challengeId);
    
    throw new CaptchaError('CHALLENGE_EXPIRED', {
      message: `Challenge '${challengeId}' has expired.`,
      details: { 
        challengeId, 
        timestamp: challenge.timestamp, 
        expiry: challenge.expiry, 
        now: Date.now(), 
        age: challengeAge, 
        maxAge 
      }
    });
  }
  
  // 4. Return the challenge if successful
  console.log(`Challenge ${challengeId} retrieved and validated successfully.`);
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

/**
 * Verifies CAPTCHA submission results
 * @param {Object} submission - User submission data
 * @param {Object} challenge - Challenge data sent to client
 * @param {Object} suiteData - Suite configuration data
 * @returns {Object} Verification results with standardized format
 */
async function verifyAutoTests(submission, challenge, suiteData) {
  try {
    
    // Verify proof of work
    verifyProofOfWork(submission);
    
    // Evaluate automatic test results
    const testEvaluations = await evaluateAutomaticTests(submission, challenge, suiteData);
    
    // Calculate combined bot probability
    const totalBotProbability = calculateCombinedBotProbability(testEvaluations);
    console.log(`Total bot probability from automatic tests: ${totalBotProbability.toFixed(3)}`);
    
    // Determine if interactive challenge is needed
    const result = determineAutoTestsResult(challenge, suiteData, totalBotProbability);
    return {
      valid: result.valid,
      testResults: testEvaluations,
      botProbability: totalBotProbability,
      interactiveChallenge: result.interactiveChallenge || null
    }
  } catch (error) {
    return handleVerificationError(error);
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
function determineAutoTestsResult(challenge, suiteData, totalBotProbability) {
  
  // Bot probability exceeds threshold, need interactive challenge
  if (totalBotProbability >= INTERACTIVE_CHALLENGE_THRESHOLD) {
    console.log('Bot probability threshold exceeded, interactive challenge required');
    
    // Create interactive challenge configuration
    const interactiveChallenge = createInteractiveChallenge(
      challenge,
      suiteData,
      totalBotProbability
    );
    
    return {
      valid: false,
      interactiveChallenge
    };
  }
  
  // Bot probability below threshold, verification successful
  return {
    valid: true
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

module.exports = {
  assignTestSuite,
  createChallengeForRequest,
  getAndVerifyChallenge,
  verifyAutoTests
};