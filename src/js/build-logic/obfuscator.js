const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

async function obfuscateBundle(bundleInfo) {
  const { bundleId, bundleDir } = bundleInfo;
  
  // Read the source bundle
  const sourceCode = fs.readFileSync(path.join(bundleDir, 'captcha.src.js'), 'utf8');
  
  // Generate unique obfuscation options for this bundle
  const obfuscationOptions = generateUniqueObfuscationOptions(bundleId);
  
  // Apply obfuscation
  const obfuscatedResult = JavaScriptObfuscator.obfuscate(
    sourceCode,
    obfuscationOptions
  );
  
  // Save obfuscated code
  fs.writeFileSync(
    path.join(bundleDir, 'captcha.js'),
    obfuscatedResult.getObfuscatedCode()
  );
  
  // Save minified version
  const minified = await minifyCode(obfuscatedResult.getObfuscatedCode());
  fs.writeFileSync(
    path.join(bundleDir, 'captcha.min.js'),
    minified
  );
  
  return {
    ...bundleInfo,
    obfuscationOptions
  };
}

function generateUniqueObfuscationOptions(bundleId) {
  // Create pseudo-random but deterministic options based on bundleId
  const seed = parseInt(bundleId.replace(/[^0-9]/g, '').substring(0, 8), 10);
  const random = new PseudoRandom(seed);
  
  // Determine if debug protection is enabled
  const debugProtectionEnabled = random.next() > 0.5;
  
  return {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.6 + (random.next() * 0.3),
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4 + (random.next() * 0.4),
    debugProtection: debugProtectionEnabled,
    // Only set the interval if debug protection is enabled
    debugProtectionInterval: debugProtectionEnabled ? Math.floor(1000 + random.next() * 3000) : 0,
    disableConsoleOutput: false, // Keep for debugging
    domainLock: [],
    identifierNamesGenerator: ['hexadecimal', 'mangled'][Math.floor(random.next() * 2)],
    identifiersPrefix: '',
    inputFileName: '',
    log: false,
    renameGlobals: random.next() > 0.5,
    reservedNames: [],
    rotateStringArray: true,
    seed: seed,
    selfDefending: true,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 5 + Math.floor(random.next() * 10),
    stringArray: true,
    stringArrayEncoding: random.next() > 0.5 ? ['base64'] : ['rc4'],
    stringArrayThreshold: 0.7 + (random.next() * 0.3),
    transformObjectKeys: random.next() > 0.3,
    unicodeEscapeSequence: random.next() > 0.7
  };
}

// Predictable random number generator for deterministic but varied obfuscation
class PseudoRandom {
  constructor(seed) {
    this.seed = seed;
    this.m = 2**35 - 31;
    this.a = 185852;
    this.c = 1;
    this.state = seed % this.m;
  }
  
  next() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }
}

async function minifyCode(code) {
  // In a real implementation, use a proper minifier like Terser
  // This is a placeholder
  return code
    .replace(/\s+/g, ' ')
    .replace(/\/\/.*?\n/g, '')
    .replace(/\/\*.*?\*\//g, '');
}
module.exports = { obfuscateBundle };