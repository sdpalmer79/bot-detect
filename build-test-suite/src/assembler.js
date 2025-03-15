const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharedCode = require('@sdpalmer79/captcha-shared-code');

const MIN_TESTS = parseEnvNumber(process.env.MIN_TESTS, 8);
const MIN_INTERACTIVE_TESTS = parseEnvNumber(process.env.MIN_INTERACTIVE_TESTS, 3); 

function parseEnvNumber(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  return !isNaN(num) ? num : defaultValue;
}

// Separate loading of automatic and interactive templates
const automaticTemplates = loadAutomaticTemplates();
const interactiveTemplates = loadInteractiveTemplates();

// Load all automatic test templates from autoTemplates.js
function loadAutomaticTemplates() {
  // Import test template modules
  const {
    tokenTests,
    webglTests, 
    timingTests, 
    environmentTests, 
    interactionTests,
    networkTests,
    inputBehaviorTests,
    deviceIntegrityTests,
    automationTests
  } = require('./autoTemplates');
  
  // Return automatic templates object
  return {
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
}

// Load all interactive test templates from interactiveTemplates.js
function loadInteractiveTemplates() {
  // Import interactive visual challenge templates
  const {
    numberSequenceCompletionTests
  } = require('./interactiveTemplates');
  
  // Return interactive templates object
  return {
    numberSequenceCompletionTests
  };
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

/**
 * Selects multiple tests from a category
 * @param {Object} templates - Test templates
 * @param {string} category - Category name (e.g., 'timingTests')
 * @param {Object} options - Selection options
 * @param {number} [options.maxCount=1] - Maximum number of tests to select
 * @param {Array<string>} [options.exclude=[]] - IDs to exclude
 * @param {Array<string>} [options.include=[]] - IDs to specifically include
 * @param {boolean} [options.randomize=true] - Whether to randomize selection
 * @param {string} [options.seed] - Seed for deterministic selection
 * @return {Array<Object>} - Selected tests
 */
function selectMultipleFromCategory(templates, category, options = {}) {
  const {
    maxCount = 1,
    exclude = [],
    include = [],
    randomize = true,
    seed = crypto.randomBytes(8).toString('hex')
  } = options;
  
  // Rest of the function should use maxCount instead of count
  if (!templates[category] || !templates[category].variations || 
      templates[category].variations.length === 0) {
    return [];
  }
  
  // First handle specifically included tests
  let selectedTests = [];
  
  if (include && include.length > 0) {
    include.forEach(id => {
      const test = templates[category].variations.find(t => t.id === id);
      if (test && !exclude.includes(id)) {
        selectedTests.push(test);
      }
    });
  }
  
  // Get available tests that aren't in the exclude list or already included
  const alreadyIncludedIds = selectedTests.map(t => t.id);
  const availableTests = templates[category].variations.filter(
    test => !exclude.includes(test.id) && !alreadyIncludedIds.includes(test.id)
  );
  
  if (availableTests.length === 0 && selectedTests.length === 0) {
    return [];
  }
  
  // If we need more tests to reach maxCount
  if (selectedTests.length < maxCount) {
    const remainingCount = maxCount - selectedTests.length;
    
    // If maxCount exceeds available tests, return all available plus included
    if (remainingCount >= availableTests.length) {
      return [...selectedTests, ...availableTests];
    }
    
    // For deterministic selection, use the seed
    if (randomize) {
      // Create a seeded random number generator
      const seedInt = parseInt(seed.substring(0, 8), 16);
      const rng = new PseudoRandom(seedInt);
      
      // Fisher-Yates shuffle with seed
      const shuffled = [...availableTests];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Return the requested number of tests plus included ones
      return [...selectedTests, ...shuffled.slice(0, remainingCount)];
    } else {
      // For non-random selection, take the first N tests
      return [...selectedTests, ...availableTests.slice(0, remainingCount)];
    }
  }
  
  return selectedTests;
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
 * Selects random tests from various categories to use as dummy tests
 * @param {Object} templates - Automatic test templates
 * @param {string} seed - Seed for deterministic selection
 * @param {Array<string>} excludeIds - IDs of tests to exclude
 * @param {Object} [options] - Selection options
 * @param {number} [options.count] - Number of dummy tests to select (default: 2-5)
 * @param {Array<string>} [options.preferredCategories] - Categories to prefer for dummy tests
 * @return {Array<Object>} - Selected dummy tests
 */
function selectRandomDummyTests(templates, seed, excludeIds, options = {}) {
    // Create a seeded random number generator
    const seedInt = parseInt(seed.substring(0, 8), 16);
    const rng = new PseudoRandom(seedInt);
    
    // Determine how many dummy tests to select
    const minCount = options.minCount || 2;
    const maxCount = options.maxCount || 5;
    const count = minCount + Math.floor(rng.next() * (maxCount - minCount + 1));
    
    // Get preferred categories or use all available automatic categories
    const preferredCategories = options.preferredCategories || Object.keys(templates);
    
    // Collect all available tests from preferred categories
    const availableTests = [];
    for (const category of preferredCategories) {
      if (templates[category]?.variations) {
        // Filter out tests that are already selected
        const categoryTests = templates[category].variations.filter(
          test => !excludeIds.includes(test.id)
        );
        availableTests.push(...categoryTests);
      }
    }
    
    // If no available tests, return empty array
    if (availableTests.length === 0) {
      return [];
    }
    
    // Shuffle available tests using Fisher-Yates with seeded RNG
    const shuffled = [...availableTests];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Select up to 'count' tests, but no more than available
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    // Mark the selected tests as dummy tests (not real verification tests)
    return selected.map(test => ({
      ...test,
      isRealTest: false
    }));
}
  
// Select a mix of tests
function selectTests(seed, templates) {
    // Always include token verification test
    const tokenTests = selectMultipleFromCategory(templates, 'tokenTests', {
      include: ['token_verification']
    });

    const webglTests = selectMultipleFromCategory(templates, 'webglTests', {
      include: ['webgl_fingerprinting']
    });
    
    const timingTests = selectMultipleFromCategory(templates, 'timingTests', {
      maxCount: 2 + (parseInt(seed.substring(0, 2), 16) % 3), // 2-4 timing tests
      seed: seed + '_timing'
    });
    
    const environmentTests = selectMultipleFromCategory(templates, 'environmentTests', {
      maxCount: 2 + (parseInt(seed.substring(0, 2), 16) % 3), // 2-4 environment tests
      include: ['browser_fingerprint'],
      seed: seed + '_environment'
    });
    
    const networkTests = selectMultipleFromCategory(templates, 'networkTests', {
      maxCount: 2 + (parseInt(seed.substring(0, 2), 16) % 3), // 2-4 network test
      seed: seed + '_network'
    });

    // Combine all tests and mark them as real tests
    const coreTests = [
      ...tokenTests,
      ...webglTests,
      ...timingTests,
      ...environmentTests,
      ...networkTests
    ].map(test => ({ ...test, isRealTest: true }));
    
    // Throw an error if we don't have enough tests
    if (coreTests.length < MIN_TESTS) {
      throw new Error(`Failed to select enough core tests: ${coreTests.length}`);
    } 

    // Select dummy tests from any category
    const selectedIds = coreTests.map(t => t.id);
    const dummyTests = selectRandomDummyTests(templates, seed, selectedIds);
    
    return [...coreTests, ...dummyTests];
}
  
/**
 * Selects interactive tests of various difficulty levels for the suite
 * Each suite includes multiple interactive tests, but only one will be used at runtime
 * based on the automatic test results and bot probability assessment
 * 
 * @param {string} seed - Seed for deterministic selection
 * @param {Object} templates - Interactive templates
 * @return {Array<Object>} - Selected interactive tests marked with isInteractive: true
 */
function selectInteractiveTests(seed, templates) {
  // Get interactive test categories
  const interactiveCategories = Object.keys(templates);
  
  // Create a deterministic random number generator
  const seedInt = parseInt(seed.substring(0, 8), 16);
  const rng = new PseudoRandom(seedInt);
  
  // We need exactly 3 tests - one for each difficulty level
  const selectedTests = [];
  
  // Shuffle the categories to select from random ones
  const shuffledCategories = [...interactiveCategories];
  for (let i = shuffledCategories.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffledCategories[i], shuffledCategories[j]] = [shuffledCategories[j], shuffledCategories[i]];
  }
  
  // Define difficulty levels
  const difficultyLevels = ['easy', 'medium', 'hard'];
  
  // For each difficulty level, attempt to select one test from a random category
  difficultyLevels.forEach(difficultyLevel => {
    // Group all tests from all categories by this difficulty level
    const testsForDifficultyLevel = [];
    
    shuffledCategories.forEach(category => {
      if (templates[category]?.variations) {
        // Filter tests to only include those matching the current difficulty level
        const matchingTests = templates[category].variations.filter(test => {
          const difficulty = test.difficultyLevel || 5; // Default to medium
          
          if (difficultyLevel === 'easy' && difficulty <= 3) {
            return true;
          } else if (difficultyLevel === 'medium' && difficulty > 3 && difficulty <= 7) {
            return true;
          } else if (difficultyLevel === 'hard' && difficulty > 7) {
            return true;
          }
          return false;
        });
        
        // Add category information to each test
        matchingTests.forEach(test => {
          testsForDifficultyLevel.push({
            ...test,
            categoryName: templates[category].category
          });
        });
      }
    });
    
    // Randomly select one test from each difficulty level
    if (testsForDifficultyLevel.length > 0) {
      const selectedIndex = Math.floor(rng.next() * testsForDifficultyLevel.length);
      const selectedTest = testsForDifficultyLevel[selectedIndex];
      
      // Add the selected test to the final list
      const uniqueId = `test_${crypto.createHash('sha256').update(selectedTest.id + seed + selectedIndex).digest('hex').substring(0, 8)}`;
    
      // Create a unique name for this test function
      const functionName = `interactive_${uniqueId}`;
    
      selectedTests.push({
        id: uniqueId,
        functionName,
        originalId: selectedTest.id,
        code: selectedTest.code,
        isInteractive: true,
        difficultyLevel: selectedTest.difficultyLevel,
        paramValues: generateTestParams(selectedTest, seed + selectedIndex, { transformSeed: seed})
      });
    }
  });

  // If we don't have enough tests, throw an error. max tests is always 3 - one for each difficulty level
  if (selectedTests.length < MIN_INTERACTIVE_TESTS) {
    throw new Error(`Failed to select enough interactive tests: ${selectedTests.length}`);
  }
  
  return selectedTests;
}

/**
 * Shuffles the order of tests in a deterministic way based on seed
 * Places tests in completely random order with no dependencies
 * 
 * @param {Array<Object>} tests - Array of selected tests
 * @param {string} seed - Random seed for shuffling
 * @return {Array<Object>} - Shuffled test array
 */
function shuffleTests(tests, seed) {
  // Create a seeded random number generator
  const seedInt = parseInt(seed.substring(0, 8), 16);
  const rng = new PseudoRandom(seedInt);
  
  // Create a copy of all tests to shuffle
  const allTests = [...tests];
  
  // Fisher-Yates shuffle with seeded RNG
  for (let i = allTests.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [allTests[i], allTests[j]] = [allTests[j], allTests[i]];
  }
  
  // Record the shuffle mapping for verification purposes
  allTests.forEach((test, index) => {
    test.originalIndex = tests.findIndex(t => t.id === test.id);
    test.shuffledIndex = index;
  });
  
  return allTests;
}
  
/**
 * Generates parameter values for a test based on its paramRanges and a seed
 * @param {Object} test - Test object containing paramRanges
 * @param {string} seed - Seed for deterministic parameter generation
 * @return {Object} - Object mapping parameter names to values
 */
function generateTestParams(test, seed, suiteParams = {}) {
  // If test has no parameter ranges, return empty object
  if (!test.paramRanges) {
    return {};
  }
  
  // Create a deterministic random number generator
  const seedInt = parseInt(seed.substring(0, 8), 16);
  const rng = new PseudoRandom(seedInt);
  
  const paramValues = {};
  
  // Process each parameter in the ranges
  Object.entries(test.paramRanges).forEach(([paramName, range]) => {
    // Handle different parameter types
    if (Array.isArray(range)) {
      // Parameter is an array of possible values - select one randomly
      const index = Math.floor(rng.next() * range.length);
      paramValues[paramName] = range[index];
    } else if (range === "DYNAMIC") {
      // Generate a dynamic value based on seed
      // Here we create a large random number between 10000-99999
      paramValues[paramName] = 10000 + Math.floor(rng.next() * 90000);
    } else if (range === "SUITE_TRANSFORM_SEED") {
      // Use the provided suite-specific transform seed
      // If not provided, generate a new one
      paramValues[paramName] = suiteParams.transformSeed || 
        crypto.randomBytes(16).toString('hex');
    } else if (typeof range === 'object' && range !== null) {
      // Handle range object with min/max/step values
      const { min, max, step = 1 } = range;
      const steps = Math.floor((max - min) / step) + 1;
      const value = min + (Math.floor(rng.next() * steps) * step);
      paramValues[paramName] = value;
    } else if (typeof range === 'number') {
      // If the parameter is just a single number, use it directly
      paramValues[paramName] = range;
    } else if (typeof range === 'string') {
      // String constant
      paramValues[paramName] = range;
    } else {
      // Default case - generate a random number between 0-999
      paramValues[paramName] = Math.floor(rng.next() * 1000);
    }
  });
  
  return paramValues;
}

function createTestChain(testOrder, seed) {
  const chainedTests = [];
  let previousTestId = null;
  
  for (let i = 0; i < testOrder.length; i++) {
    const test = testOrder[i];
    const uniqueId = `test_${crypto.createHash('sha256').update(test.id + seed + i).digest('hex').substring(0, 8)}`;
    
    // Create a unique name for this test function
    const functionName = `auto_${uniqueId}`;
    
    // Store the relationship between this test and previous test for chaining
    chainedTests.push({
      id: uniqueId,
      functionName,
      originalId: test.id,
      code: test.code,
      isRealTest: test.isRealTest,
      dependsOn: previousTestId,
      paramValues: generateTestParams(test, seed + i)
    });
    
    previousTestId = uniqueId;
  }
  
  return chainedTests;
}

function generateTestFunctions(chainedTests) {
  return chainedTests.map(test => {
    // Replace parameter placeholders with actual values
    let code = test.code;
    Object.entries(test.paramValues).forEach(([key, value]) => {
      code = code.replace(new RegExp(key, 'g'), JSON.stringify(value));
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
    
    // 1. Select automatic tests
    const selectedAutomaticTests = selectTests(suiteSeed, automaticTemplates);
    
    // 2. Select interactive tests of various difficulty levels
    const selectedInteractiveTests = selectInteractiveTests(suiteSeed, interactiveTemplates);
    
    // 3. Generate unique test order for automatic tests
    const testOrder = shuffleTests(selectedAutomaticTests, suiteSeed);
    
    // 4. Create test chain linkages for automatic tests
    const chainedTests = createTestChain(testOrder, suiteSeed);
    
    // 5. Assemble the suite code with both automatic and interactive tests
    const suiteCode = assembleSuiteCode(chainedTests, suiteSeed, selectedInteractiveTests);
    
    // 6. Create the suite directory
    const suiteDir = path.join(baseSuiteDir, `${suiteId}`);
    fs.mkdirSync(suiteDir, { recursive: true });
    
    // 7. Create original source version (for debugging)
    fs.writeFileSync(path.join(suiteDir, 'test-suite.src.js'), suiteCode);
    
    // 8. Create the suite data
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
      interactiveTests: selectedInteractiveTests.map(test => ({
        id: test.id,
        originalId: test.originalId,
        functionName: test.functionName,
        difficultyLevel: test.difficultyLevel,
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

  module.exports = { generateUniqueSuite: generateUniqueSuite };