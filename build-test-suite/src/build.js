const { generateUniqueSuite } = require('./assembler');
const { obfuscateSuite } = require('./obfuscator');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use environment variable or create a temp directory if not specified
const baseSuiteDir = process.env.SUITES_BASE_DIR || path.join(os.tmpdir(), 'captcha-suites');

// Ensure the directory exists
if (!fs.existsSync(baseSuiteDir)) {
  fs.mkdirSync(baseSuiteDir, { recursive: true });
}

async function buildSuites(count = 1) {
  console.log(`Building ${count} CAPTCHA suites...`);
  console.log(`Using suite directory: ${baseSuiteDir}`);
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a unique suite ID
    const suiteId = uuidv4();
    
    // Step 1: Generate the basic suite
    const suiteInfo = generateUniqueSuite(suiteId, baseSuiteDir);
    
    // Step 2: Apply obfuscation
    const obfuscatedInfo = await obfuscateSuite(suiteInfo);
    
    // Step 3: Record result
    results.push({
      suiteId,
      path: obfuscatedInfo.suiteDir,
      timestamp: new Date().toISOString()
    });
    
    // Progress update
    if (i % 10 === 0 || i === count - 1) {
      console.log(`Progress: ${i + 1}/${count} suites created`);
    }
  }
  
  // Write index file
  const indexPath = path.join(baseSuiteDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(results, null, 2));
  
  console.log(`Build complete. Created ${results.length} suites.`);
  return results;
}

// When run directly
if (require.main === module) {
  const count = parseInt(process.argv[2] || '100', 10);
  buildSuites(count).catch(console.error);
}

module.exports = { buildSuites };