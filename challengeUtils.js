const { v4: uuidv4 } = require('uuid');
const captchaTests = require('./captcha-tests');
const crypto = require('crypto');

const MAX_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_CHALLENGE_AGE, 5 * 60 * 1000);
const MAX_INTERACTIVE_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_INTERACTIVE_CHALLENGE_AGE, 3 * 60 * 1000); // 3 minutes default
const CHALLENGE_POW_DIFFICULTY = parseEnvNumber(process.env.CHALLENGE_POW_DIFFICULTY, 2);
const INTERACTIVE_CHALLENGE_THRESHOLD = parseEnvNumber(process.env.INTERACTIVE_CHALLENGE_THRESHOLD, 0.6);
const CHALLENGE_ID_HEADER = 'x-challenge-id';

// Challenge Statuses
const STATUS = {
  CREATED: 'CREATED',                 // Initial state in memory
  SERVED: 'SERVED',                   // Sent to client
  AUTO_PENDING: 'AUTO_PENDING',       // Tests served, awaiting auto test results
  INTERACTIVE_PENDING: 'INTERACTIVE_PENDING', // Auto tests submitted, interactive required
  COMPLETED_SUCCESS: 'COMPLETED_SUCCESS', // Final success state
  COMPLETED_FAILURE: 'COMPLETED_FAILURE'  // Final failure state
};

// Valid Status Transitions
const VALID_TRANSITIONS = {
  [STATUS.CREATED]: [STATUS.SERVED],
  [STATUS.SERVED]: [STATUS.AUTO_PENDING, STATUS.COMPLETED_SUCCESS, STATUS.COMPLETED_FAILURE],
  [STATUS.AUTO_PENDING]: [STATUS.INTERACTIVE_PENDING, STATUS.COMPLETED_SUCCESS, STATUS.COMPLETED_FAILURE],
  [STATUS.INTERACTIVE_PENDING]: [STATUS.COMPLETED_SUCCESS, STATUS.COMPLETED_FAILURE],
  
  // Terminal states have no valid transitions out
  [STATUS.COMPLETED_SUCCESS]: [],
  [STATUS.COMPLETED_FAILURE]: []
};

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

/**
 * Updates the status of a challenge, enforcing lifecycle rules and logging changes.
 * @param {Object} challenge - The challenge object to update.
 * @param {string} newStatus - The desired new status (must be one of STATUS values).
 * @param {Map<string, Object>} challengeCache - The cache storing active challenges.
 * @param {Object} [details={}] - Optional details related to the status change.
 * @returns {Object} The updated challenge object.
 * @throws {CaptchaError} If the status transition is invalid or the challenge is in a terminal state.
 */
function updateChallengeStatus(challenge, newStatus, challengeCache, details = {}) {
  if (!challenge || !challenge.id) {
    throw new CaptchaError('INVALID_CHALLENGE_OBJECT', {
      message: 'Invalid challenge object provided for status update.',
      details: { challengeId: challenge?.id }
    });
  }

  const currentStatus = challenge.status;
  const challengeId = challenge.id;

  // 1. Check if the new status is valid
  if (!Object.values(STATUS).includes(newStatus)) {
    throw new CaptchaError('INVALID_STATUS_VALUE', {
      message: `Invalid target status value: ${newStatus}`,
      details: { challengeId, currentStatus, attemptedStatus: newStatus }
    });
  }

  // 2. Check if the challenge is already in a terminal state
  if (currentStatus === STATUS.COMPLETED_SUCCESS || currentStatus === STATUS.COMPLETED_FAILURE) {
    throw new CaptchaError('CHALLENGE_ALREADY_COMPLETED', {
      message: `Challenge ${challengeId} is already completed with status ${currentStatus}. Cannot change status.`,
      details: { challengeId, currentStatus, attemptedStatus: newStatus }
    });
  }

  // 3. Check if the transition is valid
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    throw new CaptchaError('INVALID_STATUS_TRANSITION', {
      message: `Invalid status transition for challenge ${challengeId}: from ${currentStatus} to ${newStatus}.`,
      details: {
        challengeId,
        currentStatus,
        attemptedStatus: newStatus,
        allowedNext: allowedTransitions || []
      }
    });
  }

  // 4. Log the status change
  const timestamp = Date.now();
  console.log(`[Challenge Status Update] ID: ${challengeId}, From: ${currentStatus}, To: ${newStatus}, Time: ${new Date(timestamp).toISOString()}`);

  // 5. Add to history (initialize if needed)
  if (!challenge.statusHistory) {
    challenge.statusHistory = [];
    // Add the implicit 'CREATED' state if it wasn't explicitly set
    if (currentStatus !== STATUS.CREATED) {
        challenge.statusHistory.push({ status: STATUS.CREATED, previousStatus: currentStatus, timestamp: challenge.timestamp, details: { message: "Initial creation" } });
    }
  }
  challenge.statusHistory.push({ status: newStatus, timestamp, details });

  // 6. Update the challenge status
  challenge.status = newStatus;

  // 7. Update the challenge in the cache
  challengeCache.set(challengeId, challenge);

  // 8. Return the updated challenge
  return challenge;
}

function createChallenge(suiteCache, challengeCache) {
  const suiteData = assignTestSuite(suiteCache);
  const challengeId = 'test1234' //uuidv4();
  const now = Date.now();
  const challenge = {
    id: challengeId,
    suiteId: suiteData.suiteId,
    suiteUrl: `/suite/${suiteData.suiteId}`,
    timestamp: now,
    powDifficulty: CHALLENGE_POW_DIFFICULTY,
    powPrefix: `${challengeId.substring(0, 8)}-${suiteData.suiteId.substring(0, 8)}`,
    expiry: now + MAX_CHALLENGE_AGE,
    status: STATUS.CREATED, // Initialize status
    statusHistory: [{ status: STATUS.CREATED, timestamp: now }] // Initialize history
  };
  challengeCache.set(challengeId, challenge);
  console.log(`Created challenge ${challengeId} for suite ${suiteData.suiteId}`);
  return challenge;
}

/**
 * Retrieves the challenge ID from request headers and validates the challenge, including its status.
 * @param {Object} req - The Express request object.
 * @param {Map<string, Object>} challengeCache - The cache storing active challenges.
 * @param {string|string[]} [expectedStatus] - Optional. The expected status or an array of expected statuses for the challenge.
 * @returns {Object} The validated challenge object.
 * @throws {CaptchaError} If token is missing, challenge not found, challenge expired, or challenge is in an unexpected state.
 */
function getAndVerifyChallenge(req, challengeCache, expectedStatus = null) {
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
    // Optionally remove expired challenge from cache (or mark as failed/expired)
    // challengeCache.delete(challengeId);
    try {
        // Attempt to update status if not already completed
        if (challenge.status !== STATUS.COMPLETED_SUCCESS && challenge.status !== STATUS.COMPLETED_FAILURE) {
            updateChallengeStatus(challenge, STATUS.COMPLETED_FAILURE, challengeCache, { reason: 'Expired during retrieval' });
        }
    } catch (statusError) {
        console.warn(`Could not update status for expired challenge ${challengeId}: ${statusError.message}`);
        challengeCache.delete(challengeId); // Fallback to delete if status update fails
    }

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

  // --- Status Verification ---
  const currentStatus = challenge.status;

  // 4. Check if challenge is already completed
  if (currentStatus === STATUS.COMPLETED_SUCCESS || currentStatus === STATUS.COMPLETED_FAILURE) {
    throw new CaptchaError('CHALLENGE_ALREADY_COMPLETED', {
      message: `Challenge ${challengeId} is already completed with status ${currentStatus}.`,
      details: { challengeId, currentStatus }
    });
  }

  // 5. Check if the current status matches the expected status(es)
  if (expectedStatus) {
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!expectedStatuses.includes(currentStatus)) {
      throw new CaptchaError('INVALID_CHALLENGE_STATE', {
        message: `Challenge ${challengeId} is in an unexpected state. Expected: ${expectedStatuses.join(' or ')}, Actual: ${currentStatus}.`,
        details: {
          challengeId,
          currentStatus,
          expectedStatus: expectedStatuses
        }
      });
    }
  }
  // --- End Status Verification ---

  // 6. Return the challenge if successful
  console.log(`Challenge ${challengeId} retrieved and validated successfully (Status: ${currentStatus}).`);
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
  const powValid = submission.autoResults.powResult && 
                submission.autoResults.powResult.hash && 
                submission.autoResults.powResult.hash.startsWith('00');

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
    if (!submission.autoResults?.testResults || 
        !submission.autoResults.testResults.hasOwnProperty(testInfo.id)) {
      throw new CaptchaError('MISSING_TEST_RESULT', {
        message: `Missing test result for test ${testInfo.originalId} (ID: ${testInfo.id})`,
        details: {
          testId: testInfo.id,
          originalTestId: testInfo.originalId,
          availableResults: Object.keys(submission.autoResults?.testResults || {})
        }
      });
    }

    const result = submission.autoResults.testResults[testInfo.id];
    
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
  createChallenge,
  getAndVerifyChallenge,
  verifyAutoTests,
  updateChallengeStatus,
  STATUS,
  CaptchaError
};