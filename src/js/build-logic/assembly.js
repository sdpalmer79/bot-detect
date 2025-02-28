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
  initialize: function(challenge) {
    console.log("Initializing verification with challenge:", challenge.id);
    return runTests({
      challenge: challenge,
      startTime: performance.now()
    });
  },
  getTestOrder: function() {
    return [${chainedTests.map(test => `"${test.id}"`).join(', ')}];
  },
  tests: testImplementations
};
`;

  return bundleCode;
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

function generateTestExecutionChain(chainedTests) {
  return chainedTests.map(test => `
    // Execute test: ${test.originalId} (${test.id})
    console.log("Running test ${test.id}");
    const ${test.id}_result = await testImplementations["${test.id}"](testContext, { previousHash });
    results["${test.id}"] = ${test.id}_result;
    
    // Hash result with previous hash - using the test's own hash function if available
    if (testImplementations["${test.id}"].hashResult) {
      previousHash = await testImplementations["${test.id}"].hashResult(${test.id}_result, previousHash);
    } else {
      // Fallback inline hashing if the test doesn't provide a hash function
      const resultStr = JSON.stringify(${test.id}_result) + previousHash;
      try {
        const encoder = new TextEncoder();
        const buffer = encoder.encode(resultStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        previousHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (e) {
        // Ultra simple fallback
        let hash = 0;
        for (let i = 0; i < resultStr.length; i++) {
          hash = ((hash << 5) - hash) + resultStr.charCodeAt(i);
          hash |= 0;
        }
        previousHash = Math.abs(hash).toString(16).padStart(8, '0');
      }
    }
    console.log("Updated hash: " + previousHash.substring(0, 8) + "...");
  `).join('\n');
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