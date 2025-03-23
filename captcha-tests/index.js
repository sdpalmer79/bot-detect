/**
 * Main export file for all CAPTCHA tests
 * 
 * This module exports all available CAPTCHA tests organized by type:
 * - automatic: Tests that run in the background without user interaction
 * - interactive: Tests that require user interaction to complete
 */

// Import common utilities
const common = require('./common');

// Import automatic tests
const tokenVerification = require('./automatic/token-verification');
const webGLFingerprinting = require('./automatic/web-gl');

// Import interactive tests
const numberSequence = require('./interactive/number_sequence');

// Export tests by category
module.exports = {
  // Common utilities
  common,
  
  // Automatic tests (no user interaction required)
  automatic: {
    tokenVerification,
    webGLFingerprinting,
  },
  
  // Interactive tests (require user interaction)
  interactive: {
    numberSequence,
  },
  
  // Helper method to get all tests as a flat array
  getAllTests: function() {
    return [
      ...Object.values(this.automatic),
      ...Object.values(this.interactive)
    ];
  },
  
  // Helper method to get a test by ID
  getTestById: function(id) {
    return this.getAllTests().find(test => test.meta.id === id);
  }
};