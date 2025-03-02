const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load all test templates
const testTemplates = loadAllTestTemplates();

// Loads all test templates from the templates directory
function loadAllTestTemplates() {
    try {
      // Import test template modules
      const webglTests = require('./templates/webgl-tests');
      const timingTests = require('./templates/timing-tests');
      const environmentTests = require('./templates/environment-tests');
      const interactionTests = require('./templates/interaction-tests');
      const networkTests = require('./templates/network-tests');
      const inputBehaviorTests = require('./templates/input-behavior-tests'); 
      const deviceIntegrityTests = require('./templates/device-integrity-tests');
      const automationTests = require('./templates/automation-detection-tests');
  
      // Return combined templates object
      return {
        webglTests: webglTests.default || webglTests,
        timingTests: timingTests.default || timingTests,
        environmentTests: environmentTests.default || environmentTests,
        interactionTests: interactionTests.default || interactionTests,
        networkTests: networkTests.default || networkTests,
        inputBehaviorTests: inputBehaviorTests.default || inputBehaviorTests,
        deviceIntegrityTests: deviceIntegrityTests.default || deviceIntegrityTests,
        automationTests: automationTests.default || automationTests
      };
    } catch (error) {
      console.error('Failed to load test templates:', error);
      
      // Return empty templates object as fallback
      return {
        webglTests: { variations: [] },
        timingTests: { variations: [] },
        environmentTests: { variations: [] },
        interactionTests: { variations: [] },
        networkTests: { variations: [] },
        inputBehaviorTests: { variations: [] },
        deviceIntegrityTests: { variations: [] },
        automationTests: { variations: [] }
      };
    }
  }

/**
 * Selects multiple tests from a category
 * @param {Object} templates - All test templates
 * @param {string} category - Category name (e.g., 'timingTests')
 * @param {Object} options - Selection options
 * @param {number} [options.count=1] - Number of tests to select
 * @param {Array<string>} [options.exclude=[]] - IDs to exclude
 * @param {boolean} [options.randomize=true] - Whether to randomize selection
 * @param {string} [options.seed] - Seed for deterministic selection
 * @return {Array<Object>} - Selected tests
 */
function selectMultipleFromCategory(templates, category, options = {}) {
    const {
      count = 1,
      exclude = [],
      randomize = true,
      seed = crypto.randomBytes(8).toString('hex')
    } = options;
    
    if (!templates[category] || !templates[category].variations || 
        templates[category].variations.length === 0) {
      return [];
    }
    
    // Get available tests that aren't in the exclude list
    const availableTests = templates[category].variations.filter(
      test => !exclude.includes(test.id)
    );
    
    if (availableTests.length === 0) {
      return [];
    }
    
    // If count exceeds available tests, return all available
    if (count >= availableTests.length) {
      return [...availableTests];
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
      
      // Return the requested number of tests
      return shuffled.slice(0, count);
    } else {
      // For non-random selection, take the first 'count' tests
      return availableTests.slice(0, count);
    }
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
      isRealTest: false,
      
      // Optionally modify the test to be less resource-intensive
      // since it's only for obfuscation purposes
      code: modifyTestForDummyUse(test.code, rng)
    }));
  }
  
// Select a mix of tests
function selectTests(seed, templates) {
    const webglTests = selectMultipleFromCategory(templates, 'webglTests', {
      count: 1, // Always include exactly 1 WebGL test
      randomize: false // Always select the primary test
    });
    
    const timingTests = selectMultipleFromCategory(templates, 'timingTests', {
      count: 2 + (parseInt(seed.substring(0, 2), 16) % 3), // 2-4 timing tests
      randomize: true,
      seed: seed + '_timing'
    });
    
    const fingerprintTests = selectMultipleFromCategory(templates, 'environmentTests', {
      count: 1,
      randomize: false,
      specificId: 'browser_fingerprint' // Force inclusion of this specific test
    });
    
    // Combine all tests and mark them as real tests
    const coreTests = [
      ...webglTests,
      ...timingTests,
      ...fingerprintTests
    ].map(test => ({ ...test, isRealTest: true }));
    
    // Select dummy tests from any category
    const selectedIds = coreTests.map(t => t.id);
    const dummyTests = selectRandomDummyTests(templates, seed, selectedIds);
    
    return [...coreTests, ...dummyTests];
}
  
  /**
 * Orders real tests respecting dependencies between tests and resource usage
 * @param {Array<Object>} realTests - Array of real tests
 * @param {PseudoRandom} rng - Random number generator
 * @return {Array<Object>} - Ordered array of real tests
 */
function orderRealTestsWithDependencies(realTests, rng) {
    // If there are only a few tests, we can just shuffle them all
    // since we don't have strong dependencies
    if (realTests.length <= 3) {
      const shuffled = [...realTests];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    
    // For more complex test sets, categorize tests by type
    
    // Core tests that establish environment and capabilities
    const fingerprintTests = realTests.filter(test => 
      test.id.includes('fingerprint') || 
      test.originalId?.includes('fingerprint') ||
      test.id.startsWith('environment_') || 
      test.originalId?.startsWith('environment_')
    );
    
    // Hardware capability tests
    const webGLTests = realTests.filter(test => 
      test.id.startsWith('webgl_') || 
      test.originalId?.startsWith('webgl_')
    );
    
    // Performance measurement tests
    const timingTests = realTests.filter(test => 
      test.id.startsWith('timing_') || 
      test.originalId?.startsWith('timing_')
    );
    
    // Security environment tests
    const deviceIntegrityTests = realTests.filter(test =>
      test.id.startsWith('integrity_') ||
      test.originalId?.startsWith('integrity_') ||
      test.id.includes('device') ||
      test.originalId?.includes('device')
    );
    
    // Network behavior tests
    const networkTests = realTests.filter(test =>
      test.id.startsWith('network_') ||
      test.originalId?.startsWith('network_')
    );
    
    // Automation detection tests
    const automationTests = realTests.filter(test =>
      test.id.startsWith('automation_') ||
      test.originalId?.startsWith('automation_')
    );
    
    // Interactive behavior tests
    const interactionTests = realTests.filter(test =>
      test.id.startsWith('interaction_') ||
      test.originalId?.startsWith('interaction_')
    );
    
    // Input behavior tests
    const inputTests = realTests.filter(test =>
      test.id.startsWith('input_') ||
      test.originalId?.startsWith('input_')
    );
    
    // Any tests that don't fit the defined categories
    const otherTests = realTests.filter(test => 
      !webGLTests.includes(test) && 
      !fingerprintTests.includes(test) && 
      !timingTests.includes(test) &&
      !deviceIntegrityTests.includes(test) &&
      !networkTests.includes(test) &&
      !automationTests.includes(test) &&
      !interactionTests.includes(test) &&
      !inputTests.includes(test)
    );
    
    // Create ordered test sequence with optimal dependencies
    const orderedTests = [];
    
    // PHASE 1: Environment baseline - start with tests that establish what we're working with
    
    // 1. Start with fingerprint/environment test to establish browser identity
    if (fingerprintTests.length > 0) {
      orderedTests.push(fingerprintTests[0]);
      fingerprintTests.splice(0, 1);
    }
    
    // 2. Add a device integrity test early to detect compromised environments
    if (deviceIntegrityTests.length > 0) {
      orderedTests.push(deviceIntegrityTests[0]);
      deviceIntegrityTests.splice(0, 1);
    }
    
    // 3. Add one WebGL test early to establish hardware capability
    if (webGLTests.length > 0) {
      orderedTests.push(webGLTests[0]);
      webGLTests.splice(0, 1);
    }
    
    // 4. Add one timing test to establish performance baseline
    if (timingTests.length > 0) {
      orderedTests.push(timingTests[0]);
      timingTests.splice(0, 1);
    }
    
    // PHASE 2: Create pools of remaining tests to intersperse
    
    // First pool: Tests that are resource-intensive and should be spaced out
    const resourceIntensiveTests = [
      ...webGLTests,
      ...networkTests
    ];
    
    // Second pool: Tests that provide additional security signals
    const securityTests = [
      ...deviceIntegrityTests,
      ...automationTests
    ];
    
    // Third pool: Tests that measure user behavior
    const behaviorTests = [
      ...interactionTests,
      ...inputTests
    ];
    
    // Final pool: Remaining tests to fill gaps
    const remainingTests = [
      ...fingerprintTests,
      ...timingTests,
      ...otherTests
    ];
    
    // Shuffle each pool with seeded randomness for unpredictability
    function shufflePool(pool) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    }
    
    shufflePool(resourceIntensiveTests);
    shufflePool(securityTests);
    shufflePool(behaviorTests);
    shufflePool(remainingTests);
    
    // PHASE 3: Intersperse tests from different pools to create balanced sequence
    
    // Calculate how to distribute tests (aim for even distribution)
    const totalRemaining = resourceIntensiveTests.length + 
                           securityTests.length +
                           behaviorTests.length + 
                           remainingTests.length;
    
    if (totalRemaining === 0) {
      return orderedTests; // Return what we have if no more tests
    }
    
    // Calculate rough spacing between similar test types
    const approximateGap = Math.max(1, Math.ceil(totalRemaining / 4));
    
    // Build the sequence by alternating between pools
    while (resourceIntensiveTests.length > 0 || 
           securityTests.length > 0 || 
           behaviorTests.length > 0 || 
           remainingTests.length > 0) {
      
      // Add a resource intensive test if available (but not consecutive ones)
      if (resourceIntensiveTests.length > 0 && 
          (orderedTests.length === 0 || 
          !resourceIntensiveTests.includes(orderedTests[orderedTests.length - 1]))) {
        orderedTests.push(resourceIntensiveTests.shift());
      }
      
      // Add a security test if available
      if (securityTests.length > 0) {
        orderedTests.push(securityTests.shift());
      }
      
      // Add behavior tests in small groups (they often work together)
      const behaviorTestsToAdd = Math.min(
        behaviorTests.length,
        1 + Math.floor(rng.next() * 2) // Add 1-2 behavior tests in sequence
      );
      
      for (let i = 0; i < behaviorTestsToAdd; i++) {
        orderedTests.push(behaviorTests.shift());
      }
      
      // Fill with remaining tests
      if (remainingTests.length > 0) {
        orderedTests.push(remainingTests.shift());
      }
    }
    
    return orderedTests;
  }

/**
 * Shuffles the order of tests in a deterministic way based on seed
 * Ensures critical test dependencies are maintained while randomizing order
 * 
 * @param {Array<Object>} tests - Array of selected tests
 * @param {string} seed - Random seed for shuffling
 * @return {Array<Object>} - Shuffled test array
 */
function shuffleTests(tests, seed) {
    // Create a seeded random number generator
    const seedInt = parseInt(seed.substring(0, 8), 16);
    const rng = new PseudoRandom(seedInt);
    
    // First, separate real tests and dummy tests
    const realTests = tests.filter(test => test.isRealTest);
    const dummyTests = tests.filter(test => !test.isRealTest);
    
    // Keep track of the original sequence of real tests for validation
    const originalRealTestSequence = [...realTests];
    
    // Shuffle dummy tests (these can go anywhere)
    const shuffledDummyTests = [...dummyTests];
    for (let i = shuffledDummyTests.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffledDummyTests[i], shuffledDummyTests[j]] = [shuffledDummyTests[j], shuffledDummyTests[i]];
    }
    
    // Create a sequence for real tests that respects dependencies
    // Critical tests like fingerprinting may need to remain in a specific relative order
    const orderedRealTests = orderRealTestsWithDependencies(realTests, rng);
    
    // Now we need to interleave the dummy tests between the real tests
    const finalTestSequence = [];
    
    // Interleave in a way that doesn't put too many dummy tests together
    // This makes it harder to identify which are the real tests
    if (shuffledDummyTests.length === 0) {
      // If no dummy tests, just use the ordered real tests
      return orderedRealTests;
    } else {
      // Distribute dummy tests between real tests
      // We'll create slots between real tests where dummy tests can go
      
      // Start with the first real test (always keep this first for proper initialization)
      finalTestSequence.push(orderedRealTests[0]);
      
      // Initialize dummy test index
      let dummyIndex = 0;
      
      // For each gap between real tests
      for (let i = 1; i < orderedRealTests.length; i++) {
        // Decide how many dummy tests to insert before the next real test
        const maxDummiesToInsert = Math.min(
          shuffledDummyTests.length - dummyIndex,
          // Use RNG to determine how many dummy tests to insert (0-3)
          Math.floor(rng.next() * 4)
        );
        
        // Insert the determined number of dummy tests
        for (let j = 0; j < maxDummiesToInsert; j++) {
          if (dummyIndex < shuffledDummyTests.length) {
            finalTestSequence.push(shuffledDummyTests[dummyIndex]);
            dummyIndex++;
          }
        }
        
        // Add the next real test
        finalTestSequence.push(orderedRealTests[i]);
      }
      
      // Add any remaining dummy tests at the end
      while (dummyIndex < shuffledDummyTests.length) {
        finalTestSequence.push(shuffledDummyTests[dummyIndex]);
        dummyIndex++;
      }
    }
    
    // Record the shuffle mapping for verification purposes
    finalTestSequence.forEach((test, index) => {
      test.originalIndex = tests.findIndex(t => t.id === test.id);
      test.shuffledIndex = index;
    });
    
    return finalTestSequence;
  }
  
/**
 * Generates parameter values for a test based on its paramRanges and a seed
 * @param {Object} test - Test object containing paramRanges
 * @param {string} seed - Seed for deterministic parameter generation
 * @return {Object} - Object mapping parameter names to values
 */
function generateTestParams(test, seed) {
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
    
    // Add additional entropy params that can be used for uniqueness
    paramValues['PARAM_UNIQUE_ID'] = crypto.createHash('sha256')
      .update(seed)
      .digest('hex')
      .substring(0, 16);
    
    // Add timestamp-based parameter (changes on each build but remains constant in a bundle)
    paramValues['PARAM_TIMESTAMP'] = Date.now();
    
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
  try {
    // Create deterministic JSON string (sorted keys)
    const resultStr = JSON.stringify(testResult, Object.keys(testResult).sort()) + previousHash;
    
    // Use testId as a seed to select algorithm variant (ensures diversity while being deterministic)
    const algorithmSelector = parseInt(testId.substring(testId.length - 4), 16) % 4;
    
    // Select hashing method based on environment and algorithm selector
    if (typeof crypto !== 'undefined' && crypto.subtle && algorithmSelector < 2) {
      // Use SubtleCrypto for more robust hashing when available
      const encoder = new TextEncoder();
      const buffer = encoder.encode(resultStr);
      
      // Use different hashing algorithms based on selector
      const algorithm = ['SHA-256', 'SHA-1'][algorithmSelector];
      const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // Fallback to pure JS implementations with different algorithms
      let hash = 0;
      
      // Select from different JS hash implementations
      switch(algorithmSelector) {
        case 0: // djb2 hash
          hash = 5381;
          for (let i = 0; i < resultStr.length; i++) {
            hash = ((hash << 5) + hash) + resultStr.charCodeAt(i);
          }
          break;
          
        case 1: // fnv-1a hash
          hash = 2166136261;
          for (let i = 0; i < resultStr.length; i++) {
            hash ^= resultStr.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
          }
          break;
          
        case 2: // sdbm hash
          hash = 0;
          for (let i = 0; i < resultStr.length; i++) {
            hash = resultStr.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
          }
          break;
          
        default: // jenkins one-at-a-time hash
          hash = 0;
          for (let i = 0; i < resultStr.length; i++) {
            hash += resultStr.charCodeAt(i);
            hash += (hash << 10);
            hash ^= (hash >>> 6);
          }
          hash += (hash << 3);
          hash ^= (hash >>> 11);
          hash += (hash << 15);
      }
      
      return Math.abs(hash >>> 0).toString(16).padStart(8, '0');
    }
  } catch (error) {
    console.error("Error hashing test result:", error);
    
    // Ultra simple fallback for environments with issues
    let hash = 0;
    for (let i = 0; i < resultStr.length; i++) {
      hash = ((hash << 5) - hash) + resultStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}`;

  // Generate test execution code
  const executionCode = chainedTests.map(test => `
// Execute test: ${test.originalId} (${test.id})
console.log("Running test ${test.id}");
const ${test.id}_result = await testImplementations["${test.id}"](testContext, { previousHash });
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
  let previousHash = testContext.challenge?.powHash || "initial";
  
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

function assembleBundleCode(chainedTests, bundleSeed) {
  // Begin with core imports and initialization code
  let bundleCode = `
// Automatically generated CAPTCHA bundle
// Bundle ID: ${bundleSeed}
// Generated: ${new Date().toISOString()}

// Test implementation
const testImplementations = {
${generateTestFunctions(chainedTests)}
};

// Test runner that enforces chaining
${generateChainedTestRunner(chainedTests)}

// Initialize CaptchaSystem
window.CaptchaSystem = {
  verify: function(challenge) {
    console.log("Initializing verification with challenge:", challenge.id);
    return runChainedTests({
      challenge: challenge,
      startTime: performance.now()
    });
  }
};
`;

  return bundleCode;
}

function generateUniqueBundle(bundleId) {
    // Generate a unique seed for this bundle
    const bundleSeed = crypto.randomBytes(16).toString('hex');
    
    // 1. Select tests to include (mix of core and dummy tests)
    const selectedTests = selectTests(bundleSeed, testTemplates);
    
    // 2. Generate unique test order
    const testOrder = shuffleTests(selectedTests, bundleSeed);
    
    // 3. Create test chain linkages
    const chainedTests = createTestChain(testOrder, bundleSeed);
    
    // 4. Assemble the bundle code
    const bundleCode = assembleBundleCode(chainedTests, bundleSeed);
    
    // 5. Create the bundle directory
    const bundleDir = path.join(__dirname, '..', 'bundles', `bundle-${bundleId}`);
    fs.mkdirSync(bundleDir, { recursive: true });
    
    // 6. Create original source version (for debugging)
    fs.writeFileSync(path.join(bundleDir, 'captcha.src.js'), bundleCode);
    
    // 7. Create the symbol map
    const symbolMap = createSymbolMap(chainedTests);
    fs.writeFileSync(path.join(bundleDir, 'symbols.json'), JSON.stringify(symbolMap, null, 2));
    
    // 8. Create metadata
    const metadata = {
      bundleId,
      testSequence: testOrder.map(t => t.originalId),
      testChaining: chainedTests.map(t => ({
        id: t.id,
        dependsOn: t.dependsOn,
        isRealTest: t.isRealTest
      })),
      created: new Date().toISOString(),
      validFor: '1m',
      bundleSeed
    };
    fs.writeFileSync(path.join(bundleDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    
    return {
      bundleId,
      bundleDir,
      metadata,
      symbolMap
    };
  }