const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load all test templates
const testTemplates = loadAllTestTemplates();

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

function selectTests(seed, templates) {
  // Select a mix of core tests (always needed) and dummy tests
  const coreTests = [
    // Always include critical tests that verify essential properties
    getTestByType(templates, 'webgl_core'),
    getTestByType(templates, 'timing_baseline'),
    getTestByType(templates, 'browser_fingerprint')
  ].filter(Boolean);
  
  // Select random additional tests
  const seedNum = parseInt(seed.substring(0, 8), 16);
  const numDummyTests = 2 + (seedNum % 4); // 2-5 dummy tests
  
  const dummyTests = selectRandomTests(
    templates, 
    numDummyTests,
    coreTests.map(t => t.id)
  );
  
  // Mark tests as core or dummy for later reference
  return [
    ...coreTests.map(test => ({ ...test, isRealTest: true })),
    ...dummyTests.map(test => ({ ...test, isRealTest: false }))
  ];
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