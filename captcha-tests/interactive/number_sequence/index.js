/**
 * Number Sequence Test Implementation
 * 
 * This test presents users with a sequence of numbers as an image and asks them to
 * identify the next number in the sequence. The sequence and image are generated server-side
 * to prevent client-side analysis of the pattern logic.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { createCanvas, registerFont } = require('canvas');
const os = require('os');

// Set up fonts directory - look for fonts in both system and local locations
const fontsDir = path.join(__dirname, 'fonts');
if (fs.existsSync(fontsDir)) {
  // Register custom fonts if available
  const fontFiles = fs.readdirSync(fontsDir).filter(file => file.endsWith('.ttf'));
  fontFiles.forEach(font => {
    registerFont(path.join(fontsDir, font), { family: path.basename(font, '.ttf') });
  });
}

/**
 * Generates a distorted image for a number sequence
 * @param {Array<number>} sequenceValues - Array of numbers to display
 * @param {Object} distortionParams - Distortion settings
 * @param {string} challengeId - Unique challenge ID
 * @param {Object} options - Challenge options
 * @returns {Object} Image information including path and dimensions
 */
function generateSequenceImage(sequenceValues, distortionParams, challengeId, options) {
  // Determine the suite directory from options or environment
  const baseSuiteDir = process.env.SUITES_BASE_DIR || path.join(os.tmpdir(), 'captcha-suites');
  let suiteId = options.suiteId || 'default';
  
  // Create images directory
  const suiteDir = path.join(baseSuiteDir, suiteId);
  const imagesDir = path.join(suiteDir, 'images');
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  // Set up canvas dimensions
  const width = 400;
  const height = 120;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Choose fonts based on difficulty
  const baseFonts = ['Arial', 'Helvetica', 'Tahoma'];
  let availableFonts = [...baseFonts];
  
  if (distortionParams.fontVariation) {
    // Add more varied fonts if available
    availableFonts = availableFonts.concat(['Georgia', 'Verdana', 'Impact', 'Times New Roman']);
  }
  
  // Generate background noise if needed
  if (distortionParams.noiseLevel > 0) {
    ctx.save();
    ctx.globalAlpha = distortionParams.noiseLevel * 0.3; // Adjust opacity based on noise level
    
    // Create a grid of noise dots
    const dotCount = Math.floor(100 * distortionParams.noiseLevel);
    for (let i = 0; i < dotCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 2 + 1;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 0.3)`;
      ctx.fill();
    }
    
    // Add some larger background shapes for higher difficulties
    if (distortionParams.noiseLevel > 0.3) {
      const shapeCount = Math.floor(5 * distortionParams.noiseLevel);
      for (let i = 0; i < shapeCount; i++) {
        ctx.beginPath();
        
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 40 + 10;
        
        if (Math.random() > 0.5) {
          // Circle
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        } else {
          // Rectangle
          ctx.rect(x, y, size, size / 2);
        }
        
        ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, 0.2)`;
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
  
  // Draw crossing lines for high difficulties
  if (distortionParams.crossingLines) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, 0);
      ctx.lineTo(Math.random() * width, height);
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, 0.4)`;
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * height);
      ctx.lineTo(width, Math.random() * height);
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, 0.4)`;
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  // Draw each number in the sequence
  const spacing = width / (sequenceValues.length + 1);
  const baseY = height / 2;
  
  // Connect the numbers with a line (optional)
  if (distortionParams.noiseLevel > 0.2) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = `rgba(100, 100, 100, 0.3)`;
    ctx.lineWidth = 1.5;
    
    for (let i = 0; i < sequenceValues.length; i++) {
      const x = (i + 1) * spacing;
      const y = baseY + (Math.random() * 10 - 5); // Slight y variation
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    ctx.restore();
  }
  
  // Draw sequence numbers with distortions
  for (let i = 0; i < sequenceValues.length; i++) {
    const value = sequenceValues[i];
    const x = (i + 1) * spacing;
    let y = baseY;
    
    // Choose font and size with variation
    const fontFamily = availableFonts[Math.floor(Math.random() * availableFonts.length)];
    const fontSize = 28 + (Math.random() * 8 - 4); // Base 28px with ±4px variation
    
    // Apply rotation distortion
    const rotation = (Math.random() * 2 - 1) * distortionParams.rotationRange * (Math.PI / 180);
    
    // Choose color with variation if enabled
    let textColor = '#000000'; // Default black
    if (distortionParams.colorVariation) {
      // Various dark colors for readability
      const colorOptions = ['#000080', '#800000', '#008000', '#303030', '#000000', '#404060'];
      textColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    }
    
    // Add slight positioning variation for "overlapping" effect
    let xOffset = 0;
    let yOffset = 0;
    if (distortionParams.overlapping) {
      xOffset = (Math.random() * 10 - 5);
      yOffset = (Math.random() * 10 - 5);
    }
    
    // Draw the number with transformations
    ctx.save();
    ctx.translate(x + xOffset, y + yOffset);
    ctx.rotate(rotation);
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value.toString(), 0, 0);
    
    // Add bold asterisk or question mark after the last number
    if (i === sequenceValues.length - 1) {
      ctx.fillText('?', fontSize, -2);
    }
    
    ctx.restore();
  }
  
  // Save image to file
  const imageFileName = `seq-${challengeId}.jpg`;
  const imagePath = path.join(imagesDir, imageFileName);
  
  // Save the image
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  fs.writeFileSync(imagePath, buffer);
  
  // For web access, return a relative path from suite directory
  const relativeImagePath = `/images/${imageFileName}`;
  
  return {
    path: imagePath,
    relativePath: relativeImagePath,
    width,
    height
  };
}

// Update generateChallengeParams to use the image generation
module.exports = {
  meta: {
    id: "number_sequence",
    name: "Number Sequence Challenge",
    type: "interactive",
    category: "cognitive",
    difficultyLevel: 3 // Default difficulty, can be 1-5
  },

  /**
   * Returns client-side code with parameter placeholders
   * @param {string} [seed] - Seed for selecting UI variation deterministically
   * @returns {string} JavaScript code with parameter placeholders
   */
  getClientCode(seed) {
    // TODO: Implement - return code that:
    // 1. Displays the server-generated sequence image to the user
    // 2. Provides UI for collecting user's answer
    // 3. Handles submission and feedback
    throw new Error('getClientCode not yet implemented');
  },

  /**
   * Returns all available UI variations for this test
   * @returns {Array} Array of available UI test variations
   */
  getVariations() {
    // TODO: Implement - define UI variations for:
    // 1. Standard input field for number
    // 2. Multiple choice selection
    // 3. Touch/click interface for mobile
    throw new Error('getVariations not yet implemented');
  },

  /**
   * Declares the parameters this test accepts
   * @returns {Object} Parameter definitions with possible ranges/defaults
   */
  getParameterDefinitions() {
    // TODO: Implement parameters required for number sequence test
    return {
      // Base URL for loading sequence images
      "PARAM_IMAGE_BASE_URL": {
        type: "string",
        source: "SUITE_CONFIG",
        description: "Base URL for sequence challenge images",
        default: "/challenge-images"
      },
      
      // Challenge timeout in milliseconds
      "PARAM_CHALLENGE_TIMEOUT": {
        type: "number",
        source: "SUITE_CONFIG",
        description: "Time allowed to complete the challenge in milliseconds",
        default: 30000,
        min: 10000,
        max: 120000
      },

      // Maximum attempts allowed
      "PARAM_MAX_ATTEMPTS": {
        type: "number",
        source: "SUITE_CONFIG",
        description: "Maximum number of attempts allowed",
        default: 3,
        min: 1,
        max: 5
      }
    };
  },

  /**
   * Generates challenge-specific parameters based on difficulty/context
   * This is the key function that will:
   * 1. Generate a number sequence based on difficulty
   * 2. Create a distorted image of the sequence
   * 3. Return image URL and challenge parameters
   * 
   * @param {Object} options - Context for parameter generation
   * @returns {Object} Challenge-specific parameters
   */
  generateChallengeParams(options) {
    // Extract the difficulty level (1-5)
    const difficulty = options.difficultyLevel || this.meta.difficultyLevel;
    
    // Create a deterministic seed for this challenge by combining suite seed and challenge id
    let seed = options.challengeId;
    if (options.suiteData && options.suiteData.seed) {
      seed = options.suiteData.seed + seed;
    }
    
    // Create a seeded random generator
    const seededRandom = (max = 1, min = 0) => {
      // Simple seeded random function
      const x = Math.sin(seed.split('').reduce((a, b) => {
        return a + b.charCodeAt(0);
      }, 0)) * 10000;
      
      // Update seed for next call
      seed = (seed + x).toString();
      
      return min + (Math.abs(x) % (max - min));
    };
    
    // Use seed to determine if arithmetic or geometric sequence
    const isArithmetic = seededRandom() < 0.5;
    
    // Generate sequence parameters based on difficulty
    let sequenceParams;
    let sequenceValues = [];
    let correctAnswer;
    
    if (isArithmetic) {
      // Arithmetic sequence: each number differs by a constant value
      // a, a+d, a+2d, a+3d, ...
      let start, increment;
      
      switch(difficulty) {
        case 1:
          // Simple: small starting values, small increments
          start = Math.floor(seededRandom(10, 1));
          increment = Math.floor(seededRandom(3, 1));
          break;
        case 2:
          start = Math.floor(seededRandom(20, 1));
          increment = Math.floor(seededRandom(5, 2));
          break;
        case 3:
          start = Math.floor(seededRandom(30, 5));
          increment = Math.floor(seededRandom(7, 3));
          break;
        case 4:
          start = Math.floor(seededRandom(40, 10));
          increment = Math.floor(seededRandom(10, 5));
          break;
        case 5:
          // Harder: larger starting values, larger increments
          start = Math.floor(seededRandom(50, 15));
          increment = Math.floor(seededRandom(10, 5));
          break;
      }
      
      // Generate sequence values (5 visible values)
      for (let i = 0; i < 5; i++) {
        sequenceValues.push(start + (i * increment));
      }
      
      // Calculate the correct answer (next value)
      correctAnswer = start + (5 * increment);
      
      sequenceParams = {
        type: 'arithmetic',
        start,
        increment
      };
    } else {
      // Geometric sequence: each number is multiplied by a constant
      // a, a*r, a*r^2, a*r^3, ...
      let start, ratio;
      
      switch(difficulty) {
        case 1:
          // Simple: small starting values, factor of 2
          start = Math.floor(seededRandom(5, 1));
          ratio = 2;
          break;
        case 2:
          start = Math.floor(seededRandom(5, 1));
          ratio = seededRandom() < 0.7 ? 2 : 3;
          break;
        case 3:
          start = Math.floor(seededRandom(10, 2));
          ratio = seededRandom() < 0.6 ? 2 : 3;
          break;
        case 4:
          start = Math.floor(seededRandom(10, 2));
          // More variation in ratio but still manageable
          ratio = [2, 2, 3, 3, 4][Math.floor(seededRandom(5))];
          break;
        case 5:
          // Harder: careful selection of start and ratio to avoid huge numbers
          start = Math.floor(seededRandom(10, 2));
          ratio = [2, 2, 3, 3, 4][Math.floor(seededRandom(5))];
          break;
      }
      
      // Generate sequence values (5 visible values)
      let value = start;
      for (let i = 0; i < 5; i++) {
        sequenceValues.push(value);
        value *= ratio;
      }
      
      // Calculate the correct answer (next value)
      correctAnswer = sequenceValues[4] * ratio;
      
      sequenceParams = {
        type: 'geometric',
        start, 
        ratio
      };
    }
    
    // Generate visual distortion parameters based on difficulty
    const distortionParams = {
      rotationRange: 0,        // Degrees of random rotation
      noiseLevel: 0,           // 0-1 scale
      fontVariation: false,    // Use multiple fonts
      overlapping: false,      // Elements overlap
      crossingLines: false,    // Lines crossing through numbers
      colorVariation: false    // Use varied colors
    };
    
    // Set distortion parameters based on difficulty
    switch(difficulty) {
      case 1:
        distortionParams.rotationRange = 5;
        distortionParams.noiseLevel = 0.1;
        break;
      case 2:
        distortionParams.rotationRange = 7;
        distortionParams.noiseLevel = 0.2;
        distortionParams.fontVariation = true;
        break;
      case 3:
        distortionParams.rotationRange = 10;
        distortionParams.noiseLevel = 0.3;
        distortionParams.fontVariation = true;
        distortionParams.colorVariation = true;
        break;
      case 4:
        distortionParams.rotationRange = 15;
        distortionParams.noiseLevel = 0.5;
        distortionParams.fontVariation = true;
        distortionParams.overlapping = true;
        distortionParams.colorVariation = true;
        break;
      case 5:
        distortionParams.rotationRange = 20;
        distortionParams.noiseLevel = 0.7;
        distortionParams.fontVariation = true;
        distortionParams.overlapping = true;
        distortionParams.crossingLines = true;
        distortionParams.colorVariation = true;
        break;
    }
    
    // Generate a unique challenge ID for this sequence
    const challengeId = crypto.randomBytes(16).toString('hex');
    
    // Set expiration time (5 minutes from now)
    const expiresAt = Date.now() + 300000;
    
    // Generate wrong answers for multiple choice
    // For arithmetic, use increments off by 1-3
    // For geometric, use ratios off by 1
    const wrongAnswers = [];
    const numberOfChoices = Math.min(3 + difficulty, 6); // 4 to 6 choices depending on difficulty
    
    while (wrongAnswers.length < numberOfChoices - 1) {
      let wrongAnswer;
      if (isArithmetic) {
        const wrongIncrement = sequenceParams.increment + 
                             [-3, -2, -1, 1, 2, 3][Math.floor(seededRandom(6))];
        wrongAnswer = sequenceValues[4] + wrongIncrement;
      } else {
        const wrongRatio = sequenceParams.ratio +
                         [-1, -0.5, 0.5, 1][Math.floor(seededRandom(4))];
        wrongAnswer = Math.round(sequenceValues[4] * wrongRatio);
      }
      
      // Ensure we don't accidentally include the correct answer
      // and don't duplicate wrong answers
      if (wrongAnswer !== correctAnswer && !wrongAnswers.includes(wrongAnswer)) {
        wrongAnswers.push(wrongAnswer);
      }
    }
    
    // NEW CODE: Generate the sequence image
    const imageInfo = generateSequenceImage(
      sequenceValues,
      distortionParams,
      challengeId,
      { 
        suiteId: options.suiteId || crypto.randomBytes(8).toString('hex')
      }
    );
    
    // Return challenge parameters with image URL
    return {
      challengeId,
      expiresAt,
      difficulty,
      
      // Return the relative image URL for client-side loading
      imageUrl: imageInfo.relativePath,
      imageWidth: imageInfo.width,
      imageHeight: imageInfo.height,
      
      // Parameters used for image generation (for reference/debugging)
      renderingParams: {
        sequenceValues,
        distortionParams
      },
      
      // Data needed for verification (would be stored securely server-side)
      verificationData: {
        correctAnswer,
        sequenceType: sequenceParams.type,
        sequenceParams,
        wrongAnswers,
        generatedAt: Date.now()
      }
    };
  },

  /**
   * Verifies test results against expected values
   * @param {Object} result - Client-submitted test result (user's answer)
   * @param {Object} challenge - Original challenge parameters
   * @param {Object} testParams - Test parameters from suite
   * @returns {Object} Verification result with standardized format
   */
  verifyResult(result, challenge, testParams) {
    // TODO: Implement verification logic against server-generated answer
    // This will compare the user's submitted answer with the correct next number
    
    // Placeholder implementation
    return {
      valid: false,
      botProbability: 0.5,
      confidence: 0.5,
      details: {
        message: "Verification not yet implemented"
      }
    };
  }
};