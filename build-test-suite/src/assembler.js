const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharedCode = require('@sdpalmer79/captcha-shared-code');

// Import tests from the new unified structure
const captchaTests = require('../../captcha-tests');

const MIN_TESTS = parseEnvNumber(process.env.MIN_TESTS, 8);
const MIN_INTERACTIVE_TESTS = parseEnvNumber(process.env.MIN_INTERACTIVE_TESTS, 1);
const MAX_INTERACTIVE_TESTS = parseEnvNumber(process.env.MAX_INTERACTIVE_TESTS, 3);
const TESTS_PER_CATEGORY = parseEnvNumber(process.env.TESTS_PER_CATEGORY, 2);
const DUMMY_TESTS_MIN = parseEnvNumber(process.env.DUMMY_TESTS_MIN, 2);
const DUMMY_TESTS_MAX = parseEnvNumber(process.env.DUMMY_TESTS_MAX, 5);

function parseEnvNumber(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  return !isNaN(num) ? num : defaultValue;
}

/**
 * Performs a deterministic Fisher-Yates shuffle using a seed
 * @param {Array} array - The array to shuffle
 * @param {string|number} seed - Seed for the random number generator
 * @return {Array} - New shuffled array
 */
function shuffleArray(array, seed) {
  // Convert seed to a usable numeric value if it's a string
  const seedInt = typeof seed === 'string' 
    ? parseInt(seed.substring(0, 8), 16) 
    : Math.abs(seed);
  
  // Create seeded RNG
  const rng = new PseudoRandom(seedInt);
  
  // Create copy of original array
  const shuffled = [...array];
  
  // Fisher-Yates algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Deterministic pseudo-random number generator
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

/**
 * Groups tests by their meta.category field
 * @returns {Object} - Object with category keys and arrays of tests
 */
function getTestsByCategory() {
  const automaticTests = captchaTests.getAllTests().filter(test => test.meta.type === 'automatic');
  const categories = {};
  
  automaticTests.forEach(test => {
    const category = test.meta.category;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(test);
  });
  
  return categories;
}

/**
 * Selects X tests from each category based on environment variable
 * @param {string} seed - Seed for deterministic selection
 * @returns {Array} - Selected tests marked as real tests
 */
function selectRealTests(seed) {
  const testsByCategory = getTestsByCategory();
  const selectedTests = [];
  
  // 1. First, handle special core tests that must always be included
  const tokenVerificationTest = captchaTests.automatic.tokenVerification;
  const webGLTest = captchaTests.automatic.webGLFingerprinting;
  
  if (tokenVerificationTest) {
    selectedTests.push({
      test: tokenVerificationTest,
      isRealTest: true,
      originalId: tokenVerificationTest.meta.id
    });
  }
  
  if (webGLTest) {
    selectedTests.push({
      test: webGLTest,
      isRealTest: true,
      originalId: webGLTest.meta.id
    });
  }
  
  // Get ID of tests already selected
  const selectedIds = selectedTests.map(item => item.test.meta.id);
  
  // 2. Then select X tests from each remaining category
  Object.entries(testsByCategory).forEach(([category, tests]) => {
    // Skip if all tests from this category are already selected
    if (tests.every(test => selectedIds.includes(test.meta.id))) {
      return;
    }
    
    // Filter out already selected tests
    const availableTests = tests.filter(test => !selectedIds.includes(test.meta.id));
    
    // Create a seeded RNG for this category
    const categorySeed = seed + category;
    const shuffledTests = shuffleArray(availableTests, categorySeed);
    
    // Select up to TESTS_PER_CATEGORY from this category
    const testsToSelect = Math.min(TESTS_PER_CATEGORY, shuffledTests.length);
    
    for (let i = 0; i < testsToSelect; i++) {
      const test = shuffledTests[i];
      selectedTests.push({
        test,
        isRealTest: true,
        originalId: test.meta.id
      });
      selectedIds.push(test.meta.id);
    }
  });
  
  // Check if we have enough tests
  if (selectedTests.length < MIN_TESTS) {
    throw new Error(`Failed to select enough real tests: ${selectedTests.length} < ${MIN_TESTS}`);
  }
  
  return selectedTests;
}

/**
 * Selects random tests to use as dummy tests (not verified but used as noise)
 * @param {string} seed - Seed for deterministic selection
 * @param {Array<string>} excludeIds - IDs of tests to exclude
 * @returns {Array} - Selected dummy tests
 */
function selectDummyTests(seed, excludeIds) {
  // Create a seeded random number generator
  const seedInt = parseInt(seed.substring(0, 8), 16);
  const rng = new PseudoRandom(seedInt);
  
  // Determine number of dummy tests to select (between min and max)
  const dummyTestCount = DUMMY_TESTS_MIN + Math.floor(rng.next() * 
                        (DUMMY_TESTS_MAX - DUMMY_TESTS_MIN + 1));
  
  // Get all automatic tests
  const automaticTests = captchaTests.getAllTests().filter(test => 
    test.meta.type === 'automatic' && !excludeIds.includes(test.meta.id));
  
  // If no available tests, return empty array
  if (automaticTests.length === 0) {
    return [];
  }
  
  // Shuffle available tests using the seed
  const shuffledTests = shuffleArray(automaticTests, seed + "_dummy");
  
  // Select dummy tests
  const dummyTests = [];
  for (let i = 0; i < Math.min(dummyTestCount, shuffledTests.length); i++) {
    dummyTests.push({
      test: shuffledTests[i],
      isRealTest: false, // Mark as dummy test
      originalId: shuffledTests[i].meta.id
    });
  }
  
  return dummyTests;
}

/**
 * Selects interactive tests based on user-defined criteria
 * @param {string} seed - Seed for deterministic selection
 * @returns {Array} - Selected interactive tests
 */
function selectInteractiveTests(seed) {
  // Get all interactive tests
  const interactiveTests = captchaTests.getAllTests().filter(test => 
    test.meta.type === 'interactive');
  
  // Check if we have enough interactive tests
  if (interactiveTests.length < MIN_INTERACTIVE_TESTS) {
    throw new Error(`Not enough interactive tests available. Found ${interactiveTests.length}, but minimum required is ${MIN_INTERACTIVE_TESTS}`);
  }
  
  // Create a seeded random number generator
  const rng = new PseudoRandom(parseInt(seed.substring(0, 8), 16));
  
  // Determine how many tests to select (between min and max)
  let numTests = MIN_INTERACTIVE_TESTS;
  
  // If we have enough tests, randomly select between min and max
  if (interactiveTests.length > MIN_INTERACTIVE_TESTS) {
    // Calculate a random number between MIN and MAX
    const range = MAX_INTERACTIVE_TESTS - MIN_INTERACTIVE_TESTS;
    numTests = MIN_INTERACTIVE_TESTS + Math.floor(rng.next() * (range + 1));
  }
  
  // Cap to available tests (should never be less than MIN after the check above)
  numTests = Math.min(numTests, interactiveTests.length);
  
  // Shuffle available tests using the seed
  const shuffledTests = shuffleArray(interactiveTests, seed);
  
  // Select the tests
  const selectedTests = [];
  for (let i = 0; i < numTests; i++) {
    selectedTests.push({
      test: shuffledTests[i],
      isInteractive: true,
      originalId: shuffledTests[i].meta.id
    });
  }
  
  return selectedTests;
}

/**
 * Generates parameter values for a test based on its parameter definitions and a seed
 * @param {Object} test - Test object containing parameter definitions
 * @param {string} seed - Seed for deterministic parameter generation
 * @param {Object} suiteParams - Suite-wide parameters
 * @return {Object} - Object mapping parameter names to values
 */
function generateTestParams(test, seed, suiteParams = {}) {
  // Get parameter definitions from the test
  const parameterDefinitions = test.getParameterDefinitions ? 
    test.getParameterDefinitions() : {};
  
  if (!parameterDefinitions || Object.keys(parameterDefinitions).length === 0) {
    return {};
  }
  
  // Create a deterministic random number generator
  const seedInt = parseInt(seed.substring(0, 8), 16);
  const rng = new PseudoRandom(seedInt);
  
  const paramValues = {};
  
  // Process each parameter in the definitions
  Object.entries(parameterDefinitions).forEach(([paramName, paramDef]) => {
    if (typeof paramDef === 'string') {
      // Simple string parameter - direct value or special case
      if (paramDef === "SUITE_TRANSFORM_SEED") {
        // Use the provided suite-specific transform seed
        paramValues[paramName] = suiteParams.transformSeed || 
          crypto.randomBytes(16).toString('hex');
      } else {
        // Just use the string value directly
        paramValues[paramName] = paramDef;
      }
    } else if (typeof paramDef === 'object' && paramDef !== null) {
      // Object parameter definition with min/max/step/default
      if (paramDef.min !== undefined && paramDef.max !== undefined) {
        const min = paramDef.min;
        const max = paramDef.max;
        const step = paramDef.step || 1;
        
        if (min === max) {
          // Fixed value
          paramValues[paramName] = min;
        } else {
          // Random value in range
          const steps = Math.floor((max - min) / step) + 1;
          paramValues[paramName] = min + (Math.floor(rng.next() * steps) * step);
        }
      } else if (paramDef.default !== undefined) {
        // Use default value if no range is specified
        paramValues[paramName] = paramDef.default;
      }
    } else {
      // For any other case, use the value as is
      paramValues[paramName] = paramDef;
    }
  });
  
  return paramValues;
}

function createTestChain(testOrder, seed) {
  const chainedTests = [];
  let previousTestId = null;
  
  for (let i = 0; i < testOrder.length; i++) {
    const testInfo = testOrder[i];
    const uniqueId = `test_${crypto.createHash('sha256').update(testInfo.originalId + seed + i).digest('hex').substring(0, 8)}`;
    
    // Create a unique name for this test function
    const functionName = `auto_${uniqueId}`;
    
    // Get test code using the test's own method
    const code = testInfo.test.getClientCode(seed + i);
    
    // Store the relationship between this test and previous test for chaining
    chainedTests.push({
      id: uniqueId,
      functionName,
      originalId: testInfo.originalId,
      code,
      isRealTest: testInfo.isRealTest,
      dependsOn: previousTestId,
      paramValues: generateTestParams(testInfo.test, seed + i, { transformSeed: seed })
    });
    
    previousTestId = uniqueId;
  }
  
  return chainedTests;
}

/**
 * Processes selected interactive tests
 * @param {Array} interactiveTests - Array of selected interactive tests
 * @param {string} seed - Seed for deterministic generation
 * @returns {Array} - Processed interactive tests
 */
function processInteractiveTests(interactiveTests, seed) {
  return interactiveTests.map((testInfo, index) => {
    const uniqueId = `test_${crypto.createHash('sha256').update(testInfo.originalId + seed + index).digest('hex').substring(0, 8)}`;
    
    // Create a unique name for this interactive test function
    const functionName = `interactive_${uniqueId}`;
    
    // Get code using the test's own method
    const code = testInfo.test.getClientCode(seed + index);
    
    return {
      id: uniqueId,
      functionName,
      originalId: testInfo.originalId,
      code,
      isInteractive: true,
      paramValues: generateTestParams(testInfo.test, seed + index, { transformSeed: seed })
    };
  });
}

function generateTestFunctions(chainedTests) {
  return chainedTests.map(test => {
    // Replace parameter placeholders with actual values
    let code = test.code;
    Object.entries(test.paramValues).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const valueStr = JSON.stringify(value);
      code = code.replace(placeholder, valueStr);
    });
    
    // Replace function name placeholder
    code = code.replace('TEST_FUNCTION_NAME', test.functionName);
    
    // Add function to the test implementations object
    return `  "${test.id}": ${code}`;
  }).join(',\n\n');
}

/**
 * Generates code for executing tests in a chain, with centralized result hashing
 * @param {Array<Object>} chainedTests - Array of chained tests
 * @return {string} - Generated JavaScript code for test execution chain
 */
function generateTestExecutionChain(chainedTests) {
  // Generate test execution code
  const executionCode = chainedTests.map(test => `
  // Execute test: ${test.originalId} (${test.id})
  console.log("Running test ${test.id}");
  const ${test.id}_result = await testImplementations["${test.id}"](testContext);
  results["${test.id}"] = ${test.id}_result;

  // Hash result with previous hash using centralized hashing function
  previousHash = await hashTestResult(${test.id}_result, previousHash, "${test.id}");
  console.log("Updated hash: " + previousHash.substring(0, 8) + "...");
  `).join('\n');
  
  return executionCode;
}

/** 
 * Generates the test runner function that enforces chaining
 * @param {Array<Object>} chainedTests - Array of chained tests
 * @return {string} - Generated JavaScript code for the test runner
 */
function generateChainedTestRunner(chainedTests) {
  return `// Test runner that enforces chaining
async function runChainedTests(testContext) {
  const results = {};
  let previousHash = testContext.powHash || "initial";
  
  try {
    ${generateTestExecutionChain(chainedTests)}
    
    return {
      results,
      finalHash: previousHash,
      completionTime: performance.now() - testContext.startTime
    };
  } catch (error) {
    console.error("Error running tests:", error);
    return {
      error: "Test execution failed",
      partialResults: results
    };
  }
}`;
}

/**
 * Generates the SHA-256 function implementation from shared package
 * @return {string} JavaScript code for SHA-256 implementation
 */
function generateSha256Function() {
  return `// SHA-256 hashing function
const sha256 = ${sharedCode.sha256.toString()};`;
}

function generateHashResultsFunction() {
  return `// Centralized test result hashing function
const hashTestResult = ${sharedCode.chainHashObject.toString()};`;
}

/**
 * Generates the Proof of Work implementation code
 * @return {string} JavaScript code for PoW implementation
 */
function generateProofOfWorkFunction() {
  return `// Proof of Work implementation
async function runProofOfWork(challenge) {
  try {
    // Get parameters from the challenge
    const difficulty = challenge.powDifficulty || 4;
    const prefix = challenge.powPrefix || "";
    const timestamp = challenge.timestamp;
    const token = challenge.token;
    
    // Target pattern: required number of leading zeros
    const targetPattern = new RegExp(\`^\${'0'.repeat(difficulty)}\`);
    
    // Base string includes only timestamp and token
    // This allows the server to easily verify the proof of work
    const baseString = prefix + timestamp + token;
    
    // Start searching for a solution
    let nonce = 0;
    let hash = '';
    const startTime = performance.now();
    
    // Keep trying different nonce values until we find one that works
    while (true) {
      // Check if we've been searching too long
      if (performance.now() - startTime > 10000) {
        // Prevent excessive computation - limit to 10 seconds
        return {
          nonce: nonce,
          hash: hash,
          solved: false,
          timeSpent: performance.now() - startTime,
          attemptsCount: nonce,
          timestamp: timestamp
        };
      }
      
      // Simple SHA-256 hashing
      hash = await sha256(baseString + nonce);
      
      // Check if this hash meets our difficulty requirement
      if (targetPattern.test(hash)) {
        // Found a solution!
        return {
          nonce: nonce,
          hash: hash,
          solved: true,
          timeSpent: performance.now() - startTime,
          attemptsCount: nonce,
          timestamp: timestamp
        };
      }
      
      nonce++;
      
      // Update progress occasionally
      if (nonce % 1000 === 0) {
        console.log(\`Proof of work in progress... (\${nonce} attempts)\`);
      }
    }
  } catch (error) {
    console.error("Error in proof of work:", error);
    return {
      error: "Computation failed", 
      solved: false,
      timestamp: challenge.timestamp
    };
  }
}`;
}

/**
 * Assembles the complete suite code from components
 * @param {Array<Object>} chainedTests - Array of chained tests
 * @param {string} suiteSeed - Unique seed for this suite
 * @param {Array<Object>} interactiveTests - Array of interactive tests
 * @return {string} Complete JavaScript code for the suite
 */
function assembleSuiteCode(chainedTests, suiteSeed, interactiveTests) {
  // Begin with core imports and initialization code
  let suiteCode = `
// Automatically generated CAPTCHA suite
// Suite ID: ${suiteSeed}
// Generated: ${new Date().toISOString()}

${generateProofOfWorkFunction()}

${generateSha256Function()}

${generateHashResultsFunction()}

// Test implementations
const testImplementations = {
${generateTestFunctions(shuffleArray([...chainedTests, ...interactiveTests], suiteSeed))}
};

${generateChainedTestRunner(chainedTests)}

// Initialize CaptchaSystem with integrated proof of work
window.CaptchaSystem = {
  
  startAutoVerify: async function(challenge) {
    console.log("Starting verification for challenge:", challenge.id);
    
    try {
      // Step 1: Perform proof of work
      console.log("Running proof of work...");
      const powResult = await runProofOfWork(challenge);
      
      if (!powResult.solved) {
        console.error("Failed to solve proof of work challenge");
        return {
          success: false,
          error: "Failed proof of work",
          powResult
        };
      }
      
      console.log("Proof of work completed successfully");
      
      // Step 2: Use PoW hash as the initial hash for test chain
      console.log("Starting test verification chain...");
      const testResults = await runChainedTests({
        challenge: challenge,
        startTime: performance.now(),
        powHash: powResult.hash // Use PoW hash to start the chain
      });
      
      // Step 3: Combine PoW and test results for submission
      return {
        success: true,
        testResults: testResults.results,
        finalChainHash: testResults.finalHash,
        completionTime: powResult.timeSpent + testResults.completionTime,
        powResult: powResult
      };
    } catch (error) {
      console.error("Verification process failed:", error);
      return {
        success: false,
        error: error.message || "Unknown error during verification"
      };
    }
  },
  
  // Method to activate interactive challenge when needed
  startInteractiveVerify: async function(challenge, interactiveChallenge, autoVerificationResults) {
    console.log("Starting interactive challenge");
    
    try {
      const result = await runInteractiveTest(challenge);

    } catch (error) {
      console.error("Interactive test failed:", error);
      return {
        success: false,
        error: error.message || "Unknown interactive test error"
      };
    }
  }
};
`;

  return suiteCode;
}

function generateUniqueSuite(suiteId, baseSuiteDir) {
  // Generate a unique seed for this suite
  const suiteSeed = crypto.randomBytes(16).toString('hex');
  
  // 1. Select X tests from each category and mark as real tests
  const realTests = selectRealTests(suiteSeed);
  
  // 2. Get IDs of real tests to exclude from dummy selection
  const realTestIds = realTests.map(test => test.test.meta.id);
  
  // 3. Select Y random dummy tests
  const dummyTests = selectDummyTests(suiteSeed, realTestIds);
  
  // 4. Combine real and dummy tests
  const allAutomaticTests = [...realTests, ...dummyTests];
  
  // 5. Shuffle the test order using the seed
  const shuffledTests = shuffleArray(allAutomaticTests, suiteSeed);
  
  // 6. Create test chain linkages
  const chainedTests = createTestChain(shuffledTests, suiteSeed);
  
  // 7. Select interactive tests based on difficulty levels
  const interactiveTestsRaw = selectInteractiveTests(suiteSeed);
  
  // 8. Process the interactive tests (similar to chained tests)
  const processedInteractiveTests = processInteractiveTests(interactiveTestsRaw, suiteSeed);
  
  // 9. Create the suite directory
  const suiteDir = path.join(baseSuiteDir, `${suiteId}`);
  fs.mkdirSync(suiteDir, { recursive: true });

  // 10. Create images directory for any tests that need it
  const imagesDir = path.join(suiteDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  
  // 11. Assemble the suite code
  const suiteCode = assembleSuiteCode(chainedTests, suiteSeed, processedInteractiveTests);
  
  // 12. Create original source version (for debugging)
  fs.writeFileSync(path.join(suiteDir, 'test-suite.src.js'), suiteCode);
  
  // 13. Create the suite data
  const suiteData = {
    // Suite identity
    suiteId: suiteId,
    created: new Date().toISOString(),
    suiteSeed: suiteSeed,
    
    tests: chainedTests.map(test => ({
      id: test.id,
      originalId: test.originalId,
      functionName: test.functionName,
      isRealTest: test.isRealTest,
      dependsOn: test.dependsOn,
      paramValues: test.paramValues,
      isInteractive: false
    })),
    
    // Add separate array for interactive tests
    interactiveTests: processedInteractiveTests.map(test => ({
      id: test.id,
      originalId: test.originalId,
      functionName: test.functionName,
      paramValues: test.paramValues,
      isInteractive: true
    }))
  };

  // Write suite data to file
  fs.writeFileSync(path.join(suiteDir, 'suite-data.json'), JSON.stringify(suiteData, null, 2));
      
  return {
    suiteId,
    suiteDir,
    suiteData
  };
}

module.exports = { generateUniqueSuite };