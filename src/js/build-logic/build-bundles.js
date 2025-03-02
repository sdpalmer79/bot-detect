const { generateUniqueBundle } = require('./assembler');
const { obfuscateBundle } = require('./obfuscator');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

async function buildBundles(count = 100) {
  console.log(`Building ${count} CAPTCHA bundles...`);
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a unique bundle ID
    const bundleId = uuidv4();
    
    // Step 1: Generate the basic bundle
    const bundleInfo = generateUniqueBundle(bundleId);
    
    // Step 2: Apply obfuscation
    const obfuscatedInfo = await obfuscateBundle(bundleInfo);
    
    // Step 3: Record result
    results.push({
      bundleId,
      path: obfuscatedInfo.bundleDir,
      timestamp: new Date().toISOString()
    });
    
    // Progress update
    if (i % 10 === 0 || i === count - 1) {
      console.log(`Progress: ${i + 1}/${count} bundles created`);
    }
  }
  
  // Write index file
  const indexPath = path.join(__dirname, '..', 'bundles', 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(results, null, 2));
  
  console.log(`Build complete. Created ${results.length} bundles.`);
  return results;
}

// When run directly
if (require.main === module) {
  const count = parseInt(process.argv[2] || '100', 10);
  buildBundles(count).catch(console.error);
}

module.exports = { buildBundles };