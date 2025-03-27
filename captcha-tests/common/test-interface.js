/**
 * Standard interface that all CAPTCHA test modules must implement
 * 
 * Each test module is responsible for:
 * 1. Providing client-side test code with parameter placeholders
 * 2. Defining required parameters and their sources
 * 3. Generating challenge-specific parameters (client and verification)
 * 4. Verifying client-submitted test results
 */

/**
 * @typedef {Object} TestMeta
 * @property {string} id - Unique identifier for this test
 * @property {string} name - Human-readable name
 * @property {'automatic'|'interactive'} type - Test type
 * @property {string} category - Category for grouping (e.g., "token", "webgl")
 */

/**
 * @typedef {Object} TestVariation
 * @property {string} id - Unique identifier for this variation
 * @property {string} description - Description of this variation
 * @property {string} code - Client-side code for this variation with parameter placeholders
 */

/**
 * @typedef {Object} ParameterDefinition
 * @property {string} type - Data type ("string", "number", "boolean", etc.)
 * @property {string} source - Where to get the value ("SUITE_TRANSFORM_SEED", "DYNAMIC", "SELF.property")
 * @property {string} description - Human-readable description
 * @property {*} [default] - Default value if not otherwise specified
 * @property {number} [min] - For numeric values, minimum allowed
 * @property {number} [max] - For numeric values, maximum allowed
 */

/**
 * @typedef {Object} ChallengeOptions
 * @property {string} challengeId - Challenge identifier
 * @property {number} botProbability - Bot probability from previous tests (0-1)
 * @property {Object} suiteData - Suite configuration data
 */

/**
 * @typedef {Object} ChallengeParams
 * @property {string} challengeId - Challenge identifier
 * @property {Object} clientParams - Parameters sent to the client-side test
 * @property {Object} verificationParams - Parameters used for server-side verification
 */

/**
 * @typedef {Object} VerificationResult
 * @property {boolean} valid - Whether the test was passed successfully
 * @property {number} botProbability - Estimated bot probability (0-1)
 * @property {number} confidence - Confidence in the assessment (0-1)
 * @property {Object} [details] - Test-specific verification details
 */

/**
 * @interface TestModule
 * Standard interface for all CAPTCHA test modules
 */
module.exports = {
    /**
     * Metadata about this test
     * @type {TestMeta}
     */
    meta: {
      id: "test_id",                // Implement in actual test
      name: "Test Name",            // Implement in actual test
      type: "automatic",            // "automatic" or "interactive"
      category: "category"          // Implement in actual test
    },
  
    /**
     * Returns client-side code with parameter placeholders
     * @param {string} [seed] - Seed for selecting test variation deterministically
     * @returns {string} JavaScript code with parameter placeholders
     */
    getClientCode(seed) {
      throw new Error('getClientCode must be implemented by test module');
    },
    
    /**
     * Returns all available variations for this test
     * This method is primarily for documentation and inspection
     * @returns {TestVariation[]} Array of available test variations
     */
    getVariations() {
      throw new Error('getVariations must be implemented by test module');
    },
  
    /**
     * Declares the parameters this test accepts
     * @returns {Object.<string, ParameterDefinition>} Parameter definitions with possible ranges/defaults
     */
    getParameterDefinitions() {
      throw new Error('getParameterDefinitions must be implemented by test module');
    },
  
    /**
     * Generates challenge-specific parameters based on difficulty/context
     * Returns a standardized object with separate client and verification parameters
     * 
     * @param {ChallengeOptions} options - Context for parameter generation
     * @returns {ChallengeParams} Object containing client parameters and verification parameters
     */
    generateChallengeParams(options) {
      // Default implementation with empty parameters
      return {
        challengeId: options.challengeId,
        clientParams: {},      // Parameters sent to client-side test
        verificationParams: {} // Parameters used for server-side verification only
      };
    },
  
    /**
     * Verifies test results against expected values
     * @param {Object} result - Client-submitted test result
     * @param {Object} challenge - Challenge object containing clientParams
     * @param {Object} verificationParams - Verification parameters from generateChallengeParams
     * @returns {VerificationResult} Verification result with standardized format
     */
    verifyResult(result, challenge, verificationParams) {
      throw new Error('verifyResult must be implemented by test module');
    }
};