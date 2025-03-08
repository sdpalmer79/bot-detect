const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load all test templates
const testTemplates = loadAllTestTemplates();

// Loads all test templates from the templates directory
function loadAllTestTemplates() {
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
  } = require('./templates');

  // Return combined templates object
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

/**
 * Selects multiple tests from a category
 * @param {Object} templates - All test templates
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
 * @param {Object} templates - All test templates
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
    
    // Get preferred categories or use all available
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
    
    // Select dummy tests from any category
    const selectedIds = coreTests.map(t => t.id);
    const dummyTests = selectRandomDummyTests(templates, seed, selectedIds);
    
    return [...coreTests, ...dummyTests];
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
    const uniqueId = `test_${crypto.createHash('sha256').update(seed + i).digest('hex').substring(0, 8)}`;
    
    // Create a unique name for this test function
    const functionName = `run_${uniqueId}`;
    
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
  // First add the hashTestResult function that will be used by all tests
  const hashingFunction = `
  // Centralized test result hashing function
  async function hashTestResult(testResult, previousHash, testId) {
    const resultStr = JSON.stringify(testResult, Object.keys(testResult).sort()) + previousHash;
    return await sha256(resultStr);
  }`;

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
  
  // Combine the hashing function and execution code
  return hashingFunction + '\n' + executionCode;
}

function generateChainedTestRunner(chainedTests) {
  return `
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

function assembleSuiteCode(chainedTests, suiteSeed) {
  // Begin with core imports and initialization code
  let suiteCode = `
// Automatically generated CAPTCHA suite
// Suite ID: ${suiteSeed}
// Generated: ${new Date().toISOString()}

// Test implementation
const testImplementations = {
${generateTestFunctions(chainedTests)}
};

// Proof of Work implementation
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
}

// Implementation of SHA-256 for hashing
async function sha256(message) {
  // Use SubtleCrypto if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Pure JS implementation of SHA-256 algorithm
  // This is a complete implementation matching the standard
  
  // Convert string to array of bytes
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : {
    encode: (str) => {
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xff;
      }
      return bytes;
    }
  };
  
  const bytes = encoder.encode(message);
  
  // SHA-256 constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  // Initial hash values (first 32 bits of the fractional parts of the square roots of the first 8 primes)
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  // Pre-processing: padding the message
  const bitLength = bytes.length * 8;
  const paddingLength = (512 - ((bitLength + 8 + 64) % 512)) % 512;
  
  // Create padded message (original + 1 + zeros + length as 64-bit BE integer)
  const paddedLength = Math.ceil((bitLength + 8 + paddingLength + 64) / 8);
  const padded = new Uint8Array(paddedLength);
  
  // Copy original message
  padded.set(bytes);
  
  // Append 1 followed by zeros
  padded[bytes.length] = 0x80;
  
  // Append 64-bit BE integer for original length
  const lengthBytes = new Uint8Array(8);
  let tempLength = bitLength;
  for (let i = 7; i >= 0; i--) {
    lengthBytes[i] = tempLength & 0xff;
    tempLength = tempLength >>> 8;
  }
  padded.set(lengthBytes, paddedLength - 8);
  
  // Process the message in 512-bit chunks
  for (let i = 0; i < padded.length; i += 64) {
    const chunk = padded.slice(i, i + 64);
    
    // Create message schedule array (64x 32-bit words)
    const W = new Array(64).fill(0);
    
    // Copy chunk into first 16 words of the message schedule array
    for (let j = 0; j < 16; j++) {
      W[j] = (chunk[j*4] << 24) | (chunk[j*4+1] << 16) | (chunk[j*4+2] << 8) | chunk[j*4+3];
    }
    
    // Extend the first 16 words into the remaining 48 words
    for (let j = 16; j < 64; j++) {
      const s0 = rightRotate(W[j-15], 7) ^ rightRotate(W[j-15], 18) ^ (W[j-15] >>> 3);
      const s1 = rightRotate(W[j-2], 17) ^ rightRotate(W[j-2], 19) ^ (W[j-2] >>> 10);
      W[j] = (W[j-16] + s0 + W[j-7] + s1) >>> 0;
    }
    
    // Initialize working variables to current hash value
    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];
    
    // Compression function main loop
    for (let j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[j] + W[j]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    
    // Add the compressed chunk to the current hash value
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  
  // Produce the final hash value (big-endian)
  const hashResult = H.map(h => h.toString(16).padStart(8, '0')).join('');
  return hashResult;
  
  // Helper function for right rotate
  function rightRotate(value, bits) {
    return ((value >>> bits) | (value << (32 - bits))) >>> 0;
  }
}

// Test runner that enforces chaining
${generateChainedTestRunner(chainedTests)}

// Initialize CaptchaSystem with integrated proof of work
window.CaptchaSystem = {
  verify: async function(challenge) {
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
  }
};
`;

  return suiteCode;
}

function generateUniqueSuite(suiteId, baseSuiteDir) {
    // Generate a unique seed for this suite
    const suiteSeed = crypto.randomBytes(16).toString('hex');
    
    // 1. Select tests to include (mix of core and dummy tests)
    const selectedTests = selectTests(suiteSeed, testTemplates);
    
    // 2. Generate unique test order
    const testOrder = shuffleTests(selectedTests, suiteSeed);
    
    // 3. Create test chain linkages
    const chainedTests = createTestChain(testOrder, suiteSeed);
    
    // 4. Assemble the suite code
    const suiteCode = assembleSuiteCode(chainedTests, suiteSeed);
    
    // 5. Create the suite directory
    const suiteDir = path.join(baseSuiteDir, `${suiteId}`);
    fs.mkdirSync(suiteDir, { recursive: true });
    
    // 6. Create original source version (for debugging)
    fs.writeFileSync(path.join(suiteDir, 'test-suite.src.js'), suiteCode);
    
    // 7. Create the suite data
    const suiteData = {
      // Suite identity
      suiteId: suiteId,
      created: new Date().toISOString(),
      suiteSeed: suiteSeed,
      
      // Complete test information in a single array
      tests: chainedTests.map(test => ({
        id: test.id,                   // Random ID (test_a8f3b9c2)
        originalId: test.originalId,   // Template ID (webgl_basic)
        functionName: test.functionName, // Function name in suite
        isRealTest: test.isRealTest,  // Real or dummy test
        dependsOn: test.dependsOn,    // Previous test ID for chaining
        paramValues: test.paramValues // Parameter values for this test
      })),
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