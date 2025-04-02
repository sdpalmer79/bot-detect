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

// Set up fonts directory - look for fonts in local location
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
  
  // Add a function to test if a font is available
  function isFontAvailable(fontFamily) {
    try {
      // Try to use the font in a simple measurement
      const testCanvas = createCanvas(10, 10);
      const testContext = testCanvas.getContext('2d');
      testContext.font = `12px "${fontFamily}"`;
      testContext.measureText('test');
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Use the bundled fonts in for rendering
  let availableFonts = fontFiles.map(font => path.basename(font, '.ttf'));

  // No bundled fonts - Attempt to build a list of available fonts
  if (availableFonts.length === 0) {
    const systemFontFallbacks = [
        'sans-serif',       // Should be available everywhere
        'monospace',        // Should be available everywhere
        'serif'             // Should be available everywhere
    ];
    availableFonts = [...systemFontFallbacks]; // Start with guaranteed fonts

    // Test common fonts that might be available
    const commonFonts = ['Arial', 'Helvetica', 'Tahoma', 'Georgia', 'Verdana', 'Liberation Sans'];
    commonFonts.forEach(font => {
        if (isFontAvailable(font)) {
        availableFonts.push(font);
     }
    });
  }
  
  // For font variation at higher difficulties, we'll need a larger selection
  // but will still rely on the fonts we've confirmed are available
  if (distortionParams.fontVariation && availableFonts.length > 3) {
    // We have enough fonts for variation - good
  } else if (distortionParams.fontVariation) {
    // Not enough fonts, add some variations of existing ones
    availableFonts = availableFonts.concat(
      availableFonts.map(font => `${font} bold`),
      availableFonts.map(font => `${font} italic`)
    );
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

module.exports = {
  meta: {
    id: "number_sequence",
    name: "Number Sequence Challenge",
    type: "interactive",
    category: "cognitive"
  },

  /**
   * Returns client-side code with parameter placeholders
   * @param {string} [seed] - Seed for selecting UI variation deterministically
   * @returns {string} JavaScript code with parameter placeholders
   */
  getClientCode(seed) {
    // Select variation based on seed if provided
    if (!seed) {
      seed = Date.now().toString();
    }
    
    // Create a numeric hash of the seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    
    // Select variation using the hash
    const variations = this.getVariations();
    const index = Math.abs(hash) % variations.length;
    
    return variations[index].code;
  },

  /**
   * Returns all available UI variations for this test
   * @returns {Array} Array of available UI test variations
   */
  getVariations() {
    return [
      {
        id: "number_sequence_standard",
        description: "Multiple choice options for selecting the next number in sequence",
        // Updated function signature to accept 'params' directly
        code: `async function TEST_FUNCTION_NAME(params) { 
    try {
      // params object now directly contains clientParams
      const clientParams = params || {}; 
      
      // Track behavioral data for bot detection
      const behavioralData = {
        mouseMovements: [],
        keyPressTimings: [],
        focusEvents: [],
        totalInteractionTime: 0,
        optionHoverData: [],
        startTime: Date.now()
      };
      
      // Track mouse movements
      const trackMouseMovement = (e) => {
        behavioralData.mouseMovements.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now()
        });
      };
      
      // Create container element
      const container = document.createElement('div');
      container.className = 'sequence-challenge-container';
      container.style.cssText = 'width: 100%; max-width: 500px; margin: 0 auto; padding: 20px; font-family: sans-serif; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); background: #fff;';
      
      // Add title
      const title = document.createElement('h2');
      title.textContent = 'Number Sequence Challenge';
      title.style.cssText = 'margin-top: 0; color: #333; font-size: 18px;';
      container.appendChild(title);
      
      // Add instructions
      const instructions = document.createElement('p');
      instructions.textContent = 'Look at the sequence of numbers below and determine what number should come next.';
      instructions.style.cssText = 'margin-bottom: 20px; color: #555; font-size: 14px;';
      container.appendChild(instructions);
      
      // Create image container
      const imageContainer = document.createElement('div');
      imageContainer.style.cssText = 'width: 100%; text-align: center; margin-bottom: 25px; border: 1px solid #eee; padding: 10px; border-radius: 4px; background: #f9f9f9;';
      
      // Create and add the sequence image
      const sequenceImage = document.createElement('img');
      // Access imageUrl directly from params
      sequenceImage.src = PARAM_IMAGE_BASE_URL + clientParams.imageUrl; 
      sequenceImage.alt = 'Number sequence puzzle';
      sequenceImage.style.cssText = 'max-width: 100%; height: auto; display: inline-block;';
      imageContainer.appendChild(sequenceImage);
      container.appendChild(imageContainer);
      
      // Create options area
      const optionsArea = document.createElement('div');
      optionsArea.style.cssText = 'margin: 20px 0; display: flex; flex-direction: column; align-items: center;';
      
      const optionsLabel = document.createElement('p');
      optionsLabel.textContent = 'Select the number that comes next in the sequence:';
      optionsLabel.style.cssText = 'margin-bottom: 15px; font-weight: bold; color: #333; text-align: center;';
      optionsArea.appendChild(optionsLabel);
      
      // Create choices container
      const choicesContainer = document.createElement('div');
      choicesContainer.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; width: 100%;';
      
      // Get the possible answers - access answerOptions directly from params
      const answerOptions = clientParams.answerOptions || []; 
      
      // Shuffle the answers (Fisher-Yates algorithm)
      for (let i = answerOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answerOptions[i], answerOptions[j]] = [answerOptions[j], answerOptions[i]];
      }
      
      // Create a button for each option
      answerOptions.forEach(answer => {
        const button = document.createElement('button');
        button.textContent = answer;
        button.dataset.value = answer;
        // Use single quotes for the CSS string to avoid conflict with the main template literal
        button.style.cssText = 'padding: 12px 20px; margin: 5px; font-size: 16px; background-color: #f0f0f0; border: 2px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s; min-width: 70px;';
        
        // Track hover events for bot detection
        button.addEventListener('mouseenter', () => {
          behavioralData.optionHoverData.push({
            value: answer,
            type: 'mouseenter',
            timestamp: Date.now()
          });
          
          // Visual feedback
          button.style.backgroundColor = '#e0e0e0';
          button.style.borderColor = '#ccc';
        });
        
        button.addEventListener('mouseleave', () => {
          behavioralData.optionHoverData.push({
            value: answer,
            type: 'mouseleave',
            timestamp: Date.now()
          });
          
          // Reset visual style
          button.style.backgroundColor = '#f0f0f0';
          button.style.borderColor = '#ddd';
        });
        
        choicesContainer.appendChild(button);
      });
      
      optionsArea.appendChild(choicesContainer);
      
      // Add status message area
      const statusMessage = document.createElement('div');
      statusMessage.style.cssText = 'margin-top: 15px; min-height: 20px; text-align: center;';
      optionsArea.appendChild(statusMessage);
      
      container.appendChild(optionsArea);
      
      // Start tracking mouse movements throughout the container
      container.addEventListener('mousemove', trackMouseMovement);
      
      // Attach to DOM - Assuming containerId is passed within clientParams
      const challengeContainer = document.getElementById(clientParams.containerId || 'captcha-graphic'); 
      if (challengeContainer) {
        challengeContainer.appendChild(container);
      } else {
        console.error('CAPTCHA container element not found:', clientParams.containerId || 'captcha-graphic');
        // Optionally append to body as a fallback, though this might break layout
        // document.body.appendChild(container); 
      }
      
      return new Promise((resolve) => {
        // Handle option selection
        choicesContainer.addEventListener('click', (e) => {
          const button = e.target.closest('button');
          if (!button) return;
          
          // Get selected answer
          const userAnswer = parseInt(button.dataset.value, 10);
          
          // Visual feedback
          answerOptions.forEach(answer => {
            const btn = Array.from(choicesContainer.children).find(
              b => parseInt(b.dataset.value, 10) === answer
            );
            
            if (btn) {
              btn.style.backgroundColor = '#f0f0f0';
              btn.style.borderColor = '#ddd';
              btn.disabled = true;
            }
          });
          
          button.style.backgroundColor = '#3366cc';
          button.style.borderColor = '#3366cc';
          button.style.color = 'white';
          
          // Calculate completion time
          behavioralData.totalInteractionTime = Date.now() - behavioralData.startTime;
          
          // Sample mouse movement data if too large (keep at most 100 points)
          if (behavioralData.mouseMovements.length > 100) {
            const samplingFactor = Math.floor(behavioralData.mouseMovements.length / 100);
            behavioralData.mouseMovements = behavioralData.mouseMovements.filter((_, i) => i % samplingFactor === 0);
          }
          
          // Calculate mouse movement entropy (measure of randomness/humanity)
          let entropy = 0;
          if (behavioralData.mouseMovements.length > 5) {
            // Calculate distances between consecutive points
            const distances = [];
            for (let i = 1; i < behavioralData.mouseMovements.length; i++) {
              const prev = behavioralData.mouseMovements[i-1];
              const curr = behavioralData.mouseMovements[i];
              const distance = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + 
                Math.pow(curr.y - prev.y, 2)
              );
              distances.push(distance);
            }
            
            // Calculate standard deviation of distances as a simple entropy measure
            if (distances.length > 0) {
              const mean = distances.reduce((sum, val) => sum + val, 0) / distances.length;
              const variance = distances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / distances.length;
              entropy = Math.sqrt(variance);
            }
          }
          
          behavioralData.mouseEntropyScore = entropy;
          
          // Return the result
          resolve({
            userAnswer,
            success: true,
            behavioralData
          });
        });
      });
    } catch (error) {
      console.error('Error in number sequence challenge:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }`
      }
    ];
  },

  /**
   * Declares the parameters this test accepts
   */
  getParameterDefinitions() {
    return {
      // Parameter for image URL prefix
      "PARAM_IMAGE_BASE_URL": "" // Empty string default - will be set during suite generation
    };
  },

  /**
   * Generates challenge-specific parameters based on difficulty/context
   * 
   * @param {Object} options - Context for parameter generation
   * @returns {Object} Standardized challenge parameters
   */
  generateChallengeParams(options) {
    // Extract the difficulty level (1-5)
    const difficulty = options.difficultyLevel;
    
    if (!difficulty || difficulty < 1 || difficulty > 5) {
        throw new Error('Difficulty level must be between 1 and 5');
    }

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
    
    // Generate the sequence image
    const imageInfo = generateSequenceImage(
      sequenceValues,
      distortionParams,
      options.challengeId,
      { 
        suiteId: options.suiteId || crypto.randomBytes(8).toString('hex')
      }
    );
    
    // Generate all possible answers (correct + wrong) for client-side
    const allAnswers = [correctAnswer, ...wrongAnswers];
    
    // Return standardized challenge parameters structure
    return {
      // Standard metadata
      challengeId: options.challengeId,
      
      // Client-side parameters (public)
      clientParams: {
        imageUrl: imageInfo.relativePath,
        imageWidth: imageInfo.width,
        imageHeight: imageInfo.height,
        answerOptions: allAnswers, // All possible answers without indicating which is correct
      },
      
      // Verification parameters (private, server-side only)
      verificationParams: {
        correctAnswer,
        sequenceType: sequenceParams.type,
        sequenceParams,
        difficulty
      }
    };
  },

  /**
   * Verifies test results against expected values
   * @param {Object} result - Client-submitted test result (user's answer)
   * @param {Object} challenge - Original challenge with clientParams
   * @param {Object} verificationParams - Verification parameters from generateChallengeParams
   * @returns {Object} Verification result with standardized format
   */
  verifyResult(result, verificationParams) {
    try {
      // Check for basic errors
      if (!result || result.error) {
        return {
          valid: false,
          botProbability: 0.7,
          confidence: 0.8,
          details: {
            error: result?.error || 'Invalid test result',
            message: 'Test returned an error or invalid result'
          }
        };
      }
  
      // Verify we have necessary verification data
      if (!verificationParams || !verificationParams.correctAnswer) {
        return {
          valid: false,
          botProbability: 0.5,
          confidence: 0.5,
          details: {
            message: 'Missing verification data'
          }
        };
      }
  
      // Initialize scoring
      let botProbability = 0.1; // Start with low probability
      let confidence = 0.7;
      const anomalies = [];
  
      // 1. Verify answer correctness
      const userAnswer = result.userAnswer;
      const correctAnswer = verificationParams.correctAnswer;
      const answerCorrect = (userAnswer === correctAnswer);
  
      // If answer is incorrect, increase bot probability
      if (!answerCorrect) {
        botProbability += 0.4;
        anomalies.push('incorrect_answer');
      }
  
      // Extract behavioral data for analysis
      const behavioralData = result.behavioralData || {};
      const { 
        mouseMovements = [], 
        keyPressTimings = [], 
        focusEvents = [], 
        totalInteractionTime = 0,
        inputCorrections = 0,
        mouseEntropyScore = 0
      } = behavioralData;
  
      // 2. Analyze mouse movements
      // Check if there are any mouse movements (bots often don't move the mouse)
      if (mouseMovements.length === 0) {
        botProbability += 0.3;
        anomalies.push('no_mouse_movement');
        confidence = Math.min(confidence + 0.1, 0.95);
      } else {
        // Rest of the behavioral analysis using mouseMovements, etc.
        // ...
      }
  
      // Generate final verification result
      return {
        valid: answerCorrect && botProbability < 0.6,
        botProbability,
        confidence,
        details: {
          answerCorrect,
          expectedAnswer: correctAnswer,
          userAnswer,
          sequenceType: verificationParams.sequenceType,
          anomalies,
          difficulty: verificationParams.difficulty,
          interactionTime: totalInteractionTime,
          mouseMovementCount: mouseMovements.length
          // Other behavioral metrics...
        }
      };
    } catch (error) {
      return {
        valid: false,
        botProbability: 0.5,
        confidence: 0.3,
        details: {
          error: error.message,
          message: 'Error during verification'
        }
      };
    }
  }
};