const { v4: uuidv4 } = require('uuid');

const MAX_CHALLENGE_AGE = parseEnvNumber(process.env.MAX_CHALLENGE_AGE, 5 * 60 * 1000);
const CHALLENGE_POW_DIFFICULTY = parseEnvNumber(process.env.MAX_CHALLENGE_AGE, 2);

function parseEnvNumber(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    
    const num = Number(value);
    return !isNaN(num) ? num : defaultValue;
}

function assignTestSuite() {
    
}

function createChallengeForRequest(testSuite, request) {
  
    //TO-DO create challenge id when saving to db
    const challenge = {
      suiteId: testSuite.suiteId,
      timestamp: Date.now(),
      token: getToken(),
      powDifficulty: CHALLENGE_POW_DIFFICULTY,
      powPrefix: `${challengeId.substring(0, 8)}-${testSuite.suiteId.substring(0, 8)}`,
      expiry: Date.now() + MAX_CHALLENGE_AGE // 5 minutes
    };
  }
  
function getRequestFingerprint(request) {

}

function getToken(){

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
      const powValid = submission.powResult && 
                    submission.powResult.hash && 
                    submission.powResult.hash.startsWith('00');
  
      console.log('Evaluating test results...');
      const testEvaluations = new Map();
      suiteData.tests.filter((test) => test.isRealTest).forEach(async test => {
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
          default:
            console.log(`Unknown test type: ${test.originalId}`);
            throw new CaptchaError('UNKNOWN_TEST', {
              message: `Unknown test type: ${test.originalId}`
            });
        }
      });
      
      return {
        valid: true
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
  
  // Custom error class for CAPTCHA validation
  class CaptchaError extends Error {
    constructor(code, {message, details}) {
      super(message);
      this.code = code;
      this.details = details;
    }
  }
  
  /**
   * Standalone challenge expiration check
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