/**
 * Interactive challenge templates
 * These templates are used to generate visual and interactive CAPTCHA challenges
 */

/**
 * Sequence completion test templates
 * Users must complete number sequences by selecting the correct next number in the sequence
 */
const numberSequenceCompletionTests = {
  category: "number_sequence_completion",
  description: "Number sequence completion tests",
  variations: [
    {
      id: "number_sequence_completion_easy",
      difficultyLevel: 3, // Easy difficulty
      description: "Easy number sequence completion challenge",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Get the container element from the document
          const container = document.getElementById('captcha-graphic');
          if (!container) {
            throw new Error("Captcha container element not found");
          }
          
          // Make container visible
          container.style.display = 'block';
          
          // Start tracking timing and behavioral data
          const startTime = performance.now();
          const interactionData = {
            moveCount: 0,
            clickCount: 0,
            hoverDurations: {},
            movementPath: [],
            timings: {
              firstMove: null,
              firstHover: null,
              decisionTime: null
            }
          };
          
          // Generate sequence parameters deterministically from seed
          // Note: The actual sequence is determined server-side
          // Here we only derive visual parameters
          const sequenceParams = deriveSequenceParams(PARAM_SEED, {
            difficulty: PARAM_DIFFICULTY,
            distortion: PARAM_DISTORTION,
            optionsCount: PARAM_OPTIONS_COUNT,
            sequenceType: PARAM_SEQUENCE_TYPE
          });
          
          // Request the challenge data from ctx parameters
          const sequence = ctx.challenge.parameters.sequence || [];
          const options = ctx.challenge.parameters.options || [];
          const challengeId = ctx.challenge.parameters.challengeId;
          
          if (!sequence.length || !options.length || !challengeId) {
            throw new Error("Invalid challenge parameters");
          }
          
          // Create styled container for the challenge
          container.innerHTML = '';
          const challengeContainer = document.createElement('div');
          challengeContainer.className = 'sequence-challenge';
          challengeContainer.style.cssText = \`
            font-family: Arial, sans-serif;
            text-align: center;
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 0 auto;
          \`;
          container.appendChild(challengeContainer);

          // Add title and instructions
          const title = document.createElement('h2');
          title.textContent = 'Complete the Sequence';
          title.style.cssText = 'margin: 0 0 10px; color: #333; font-size: 20px;';
          challengeContainer.appendChild(title);

          const instructions = document.createElement('p');
          instructions.textContent = 'What number comes next in this sequence?';
          instructions.style.cssText = 'margin: 0 0 20px; color: #555; font-size: 16px;';
          challengeContainer.appendChild(instructions);

          // Create sequence display with distortion applied
          const sequenceDisplay = document.createElement('div');
          sequenceDisplay.style.cssText = \`
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            background-color: white;
            padding: 15px;
            border-radius: 6px;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            box-shadow: inset 0 0 5px rgba(0,0,0,0.1);
          \`;
          challengeContainer.appendChild(sequenceDisplay);

          // Apply rendering with distortion to each number in the sequence
          sequence.forEach((number, index) => {
            const numSpan = document.createElement('span');
            
            // Apply distortion based on level
            applyDistortion(numSpan, number.toString(), sequenceParams.distortion);
            
            numSpan.style.cssText = \`
              margin: 0 10px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            \`;
            sequenceDisplay.appendChild(numSpan);

            // Add comma separator except for last item
            if (index < sequence.length - 1) {
              const comma = document.createElement('span');
              comma.textContent = ',';
              comma.style.marginRight = '5px';
              sequenceDisplay.appendChild(comma);
            }
          });

          // Add question mark for the next item
          const questionMark = document.createElement('span');
          questionMark.textContent = ', ?';
          questionMark.style.cssText = 'margin-left: 10px; color: #e74c3c;';
          sequenceDisplay.appendChild(questionMark);

          // Create options container
          const optionsContainer = document.createElement('div');
          optionsContainer.style.cssText = \`
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            margin-top: 25px;
          \`;
          challengeContainer.appendChild(optionsContainer);

          // Track mouse movement
          const trackMouseMovement = (e) => {
            if (!interactionData.timings.firstMove) {
              interactionData.timings.firstMove = performance.now() - startTime;
            }
            
            interactionData.moveCount++;
            
            // Only store every 5th movement to avoid excessive data
            if (interactionData.moveCount % 5 === 0) {
              interactionData.movementPath.push({
                x: e.clientX,
                y: e.clientY,
                t: performance.now() - startTime
              });
            }
          };

          document.addEventListener('mousemove', trackMouseMovement);
          
          // Create and track user selection
          let selectedOption = null;
          const optionElements = [];
          
          // Shuffle options to randomize positioning
          const shuffledOptions = [...options];
          for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
          }
          
          // Create option buttons
          shuffledOptions.forEach((option, index) => {
            const optionButton = document.createElement('button');
            
            // Apply distortion to option text
            applyDistortion(optionButton, option.toString(), Math.max(0, sequenceParams.distortion - 1));
            
            optionButton.style.cssText = \`
              font-size: 20px;
              min-width: 60px;
              height: 60px;
              padding: 10px 20px;
              border-radius: 8px;
              border: 2px solid #ddd;
              background-color: white;
              cursor: pointer;
              transition: all 0.2s ease;
            \`;
            optionsContainer.appendChild(optionButton);
            optionElements.push(optionButton);
            
            // Track hover time
            let hoverStart = null;
            optionButton.addEventListener('mouseenter', () => {
              hoverStart = performance.now();
              if (!interactionData.timings.firstHover) {
                interactionData.timings.firstHover = performance.now() - startTime;
              }
            });
            
            optionButton.addEventListener('mouseleave', () => {
              if (hoverStart) {
                const hoverDuration = performance.now() - hoverStart;
                interactionData.hoverDurations[index] = 
                  (interactionData.hoverDurations[index] || 0) + hoverDuration;
                hoverStart = null;
              }
            });
            
            // Selection handling
            optionButton.addEventListener('click', () => {
              interactionData.clickCount++;
              
              // Deselect previously selected option
              optionElements.forEach(el => {
                el.style.borderColor = '#ddd';
                el.style.backgroundColor = 'white';
              });
              
              // Select this option
              selectedOption = {
                value: option,
                index: index
              };
              
              optionButton.style.borderColor = '#3498db';
              optionButton.style.backgroundColor = '#ebf5fb';
              
              if (!interactionData.timings.decisionTime) {
                interactionData.timings.decisionTime = performance.now() - startTime;
              }
            });
          });

          // Create submit button
          const submitButton = document.createElement('button');
          submitButton.textContent = 'Submit';
          submitButton.style.cssText = \`
            display: block;
            margin: 30px auto 10px;
            padding: 12px 30px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
          \`;
          submitButton.addEventListener('mouseenter', () => {
            submitButton.style.backgroundColor = '#2980b9';
          });
          submitButton.addEventListener('mouseleave', () => {
            submitButton.style.backgroundColor = '#3498db';
          });
          challengeContainer.appendChild(submitButton);

          // Return a promise that resolves when the user submits their choice
          return new Promise((resolve) => {
            submitButton.addEventListener('click', () => {
              // Clean up event listeners
              document.removeEventListener('mousemove', trackMouseMovement);
              
              // Calculate total time
              const duration = performance.now() - startTime;
              
              // Prepare result with user's answer and interaction data
              const result = {
                challengeType: "number_sequence_completion", 
                challengeId: challengeId,
                duration: duration,
                userSelection: selectedOption,
                interactionData: interactionData,
                completionTime: duration
              };
              
              // Sign the result with the proof of work hash
              if (ctx.powHash) {
                // Only include data necessary for verification
                const submissionData = {
                  challengeId: challengeId,
                  selectedValue: selectedOption ? selectedOption.value : null,
                  selectedIndex: selectedOption ? selectedOption.index : null,
                  duration: duration,
                  interactionMetrics: {
                    moveCount: interactionData.moveCount,
                    clickCount: interactionData.clickCount,
                    decisionTime: interactionData.timings.decisionTime,
                    firstInteractionDelay: interactionData.timings.firstMove
                  }
                };
                
                // Create a signature using the PoW hash
                result.signature = {
                  powHash: ctx.powHash,
                  timestamp: Date.now(),
                  data: submissionData
                };
              }
              
              resolve(result);
            });
          });
          
          // Function to apply visual distortion to text elements
          function applyDistortion(element, text, level) {
            // Skip distortion for level 0
            if (level <= 0) {
              element.textContent = text;
              return;
            }

            element.innerHTML = ''; // Clear any existing content
            
            // Different distortion techniques based on level
            const chars = text.split('');
            
            chars.forEach(char => {
              const charSpan = document.createElement('span');
              charSpan.textContent = char;
              
              // Apply distortion styles based on level
              let rotation = 0;
              let skew = 0;
              let blur = 0;
              
              if (level >= 1) {
                // Level 1: Slight rotation
                rotation = (Math.random() * 2 - 1) * (level * 5);
              }
              
              if (level >= 2) {
                // Level 2: Add skew
                skew = (Math.random() * 2 - 1) * (level * 2);
                blur = level * 0.3;
              }
              
              if (level >= 3) {
                // Level 3: More aggressive distortion
                const noiseX = Math.random() * level * 1.5;
                const noiseY = Math.random() * level * 1.5;
                charSpan.style.position = 'relative';
                charSpan.style.left = \`\${noiseX}px\`;
                charSpan.style.top = \`\${noiseY}px\`;
              }
              
              charSpan.style.display = 'inline-block';
              charSpan.style.transform = \`rotate(\${rotation}deg) skew(\${skew}deg)\`;
              if (blur > 0) {
                charSpan.style.filter = \`blur(\${blur}px)\`;
              }
              
              element.appendChild(charSpan);
            });
          }
          
          // Function to derive visual parameters from seed
          function deriveSequenceParams(seed, options) {
            // In a real implementation, this would use the seed to derive 
            // deterministic but unpredictable visual parameters
            
            // For simplicity in this example, we'll just use the provided options
            // A real implementation would use cryptographic functions to derive these
            return {
              distortion: options.distortion || 2,
              optionsCount: options.optionsCount || 4,
              colorScheme: options.sequenceType === 'arithmetic' ? 'blue' : 'green'
            };
          }
        } catch (error) {
          console.error("Number sequence completion test failed:", error);
          return {
            error: "Number sequence completion test failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {
        "PARAM_DIFFICULTY": { min: 2, max: 3, step: 1 },
        "PARAM_DISTORTION": { min: 1, max: 3, step: 1 },
        "PARAM_OPTIONS_COUNT": { min: 3, max: 5, step: 1 },
        "PARAM_SEQUENCE_TYPE": ["arithmetic", "geometric", "fibonacci"],
        "PARAM_SEED": "DYNAMIC"
      }
    }
  ]
}

/**
 * Pattern completion test templates
 * Users must complete visual patterns by selecting the correct missing piece
 */
const patternCompletionTests = {
  category: "pattern_completion",
  description: "Visual pattern completion tests",
  variations: [
    {
      id: "pattern_completion_easy",
      difficultyLevel: 3, // Easy difficulty
      description: "Easy pattern completion challenge",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Get the container element from the document
          const container = document.getElementById('captcha-graphic');
          if (!container) {
            throw new Error("Captcha container element not found");
          }
          
          // Make container visible
          container.style.display = 'block';
          
          // Create interactive UI for the challenge
          const ui = new InteractionUI(container, {
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Run the pattern completion challenge
          const result = await ui.createPatternCompletionUI({
            id: ctx.challenge.id || "pattern_completion",
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Return standardized test result
          return {
            ...result,
            challengeType: "pattern_completion",
            duration: performance.now() - ctx.startTime,
            difficulty: PARAM_DIFFICULTY,
            interactionData: ui.userInteractions,
            rounds: 1
          };
        } catch (error) {
          console.error("Pattern completion test failed:", error);
          return {
            error: "Pattern completion test failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {
        "PARAM_DIFFICULTY": { min: 2, max: 3, step: 1 },
        "PARAM_SEED": "DYNAMIC"
      }
    },
    {
      id: "pattern_completion_medium",
      difficultyLevel: 5, // Medium difficulty
      description: "Medium pattern completion challenge",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Get the container element from the document
          const container = document.getElementById('captcha-graphic');
          if (!container) {
            throw new Error("Captcha container element not found");
          }
          
          // Make container visible
          container.style.display = 'block';
          
          // Create interactive UI for the challenge
          const ui = new InteractionUI(container, {
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Run the pattern completion challenge
          const result = await ui.createPatternCompletionUI({
            id: ctx.challenge.id || "pattern_completion",
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Return standardized test result
          return {
            ...result,
            challengeType: "pattern_completion",
            duration: performance.now() - ctx.startTime,
            difficulty: PARAM_DIFFICULTY,
            interactionData: ui.userInteractions,
            rounds: 1
          };
        } catch (error) {
          console.error("Pattern completion test failed:", error);
          return {
            error: "Pattern completion test failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {
        "PARAM_DIFFICULTY": { min: 4, max: 6, step: 1 },
        "PARAM_SEED": "DYNAMIC"
      }
    },
    {
      id: "pattern_completion_hard",
      difficultyLevel: 8, // Hard difficulty
      description: "Hard pattern completion challenge",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Get the container element from the document
          const container = document.getElementById('captcha-graphic');
          if (!container) {
            throw new Error("Captcha container element not found");
          }
          
          // Make container visible
          container.style.display = 'block';
          
          // Create interactive UI for the challenge
          const ui = new InteractionUI(container, {
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Run the pattern completion challenge
          const result = await ui.createPatternCompletionUI({
            id: ctx.challenge.id || "pattern_completion",
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Return standardized test result
          return {
            ...result,
            challengeType: "pattern_completion",
            duration: performance.now() - ctx.startTime,
            difficulty: PARAM_DIFFICULTY,
            interactionData: ui.userInteractions,
            rounds: 1
          };
        } catch (error) {
          console.error("Pattern completion test failed:", error);
          return {
            error: "Pattern completion test failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {
        "PARAM_DIFFICULTY": { min: 7, max: 9, step: 1 },
        "PARAM_SEED": "DYNAMIC"
      }
    }
  ]
};

/**
 * Image selection test templates
 * Users must select all images matching a specific category
 */
const imageSelectionTests = {
  category: "image_selection",
  description: "Category-based image selection tests",
  variations: [
    {
      id: "image_selection_easy",
      difficultyLevel: 3, // Easy difficulty
      description: "Easy image selection challenge",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Get the container element from the document
          const container = document.getElementById('captcha-graphic');
          if (!container) {
            throw new Error("Captcha container element not found");
          }
          
          // Make container visible
          container.style.display = 'block';
          
          // Create interactive UI for the challenge
          const ui = new InteractionUI(container, {
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Run the image selection challenge
          const result = await ui.createImageSelectionUI({
            id: ctx.challenge.id || "image_selection",
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Return standardized test result
          return {
            ...result,
            challengeType: "image_selection",
            duration: performance.now() - ctx.startTime,
            difficulty: PARAM_DIFFICULTY,
            interactionData: ui.userInteractions,
            rounds: 1
          };
        } catch (error) {
          console.error("Image selection test failed:", error);
          return {
            error: "Image selection test failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {
        "PARAM_DIFFICULTY": { min: 2, max: 3, step: 1 },
        "PARAM_SEED": "DYNAMIC"
      }
    },
    {
      id: "image_selection_medium",
      difficultyLevel: 5, // Medium difficulty
      description: "Medium image selection challenge",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Get the container element from the document
          const container = document.getElementById('captcha-graphic');
          if (!container) {
            throw new Error("Captcha container element not found");
          }
          
          // Make container visible
          container.style.display = 'block';
          
          // Create interactive UI for the challenge
          const ui = new InteractionUI(container, {
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Run the image selection challenge
          const result = await ui.createImageSelectionUI({
            id: ctx.challenge.id || "image_selection",
            difficulty: PARAM_DIFFICULTY,
            seed: PARAM_SEED
          });
          
          // Return standardized test result
          return {
            ...result,
            challengeType: "image_selection",
            duration: performance.now() - ctx.startTime,
            difficulty: PARAM_DIFFICULTY,
            interactionData: ui.userInteractions,
            rounds: 1
          };
        } catch (error) {
          console.error("Image selection test failed:", error);
          return {
            error: "Image selection test failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {
        "PARAM_DIFFICULTY": { min: 4, max: 6, step: 1 },
        "PARAM_SEED": "DYNAMIC"
      }
    }
  ]
};

/**
 * Object orientation test templates
 * Users must correctly orient 3D objects
 */
const objectOrientationTests = {
  category: "object_orientation",
  description: "3D object orientation tests",
  variations: [
    {
      id: "object_orientation_medium",
      difficultyLevel: 5, // Medium difficulty
      description: "Medium object orientation challenge",
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Get the container element from the document
          const container = document.getElementById('captcha-graphic');
          if (!container) {
            throw new Error("Captcha container element not found");
          }
          
          // Check if we need to load a 3D library
          if (!window.THREE) {
            console.warn("THREE.js library not found. Object orientation challenges require THREE.js");
            
            // Return a fallback to pattern completion challenge
            const ui = new InteractionUI(container, {
              difficulty: PARAM_DIFFICULTY,
              seed: PARAM_SEED
            });
            
            // Run a pattern completion challenge instead
            const result = await ui.createPatternCompletionUI({
              id: ctx.challenge.id || "fallback_pattern",
              difficulty: PARAM_DIFFICULTY,
              seed: PARAM_SEED
            });
            
            return {
              ...result,
              challengeType: "pattern_completion", // Note the fallback type
              fallbackReason: "3D library unavailable",
              duration: performance.now() - ctx.startTime,
              difficulty: PARAM_DIFFICULTY,
              interactionData: ui.userInteractions,
              rounds: 1
            };
          }
          
          // In a real implementation, this would create a 3D challenge
          throw new Error("3D orientation challenges not fully implemented yet");
        } catch (error) {
          console.error("Object orientation test failed:", error);
          return {
            error: "Object orientation test failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {
        "PARAM_DIFFICULTY": { min: 4, max: 6, step: 1 },
        "PARAM_SEED": "DYNAMIC"
      }
    }
  ]
};

/**
 * Templates for interactive challenges
 */

/**
 * Pattern completion challenge template
 */
const patternCompletionTemplate = `
async function interactive_pattern_completion_test(ctx) {
  try {
    // Start tracking time
    const startTime = performance.now();
    
    // Extract challenge parameters
    const difficulty = {{PARAM_DIFFICULTY}} || 5;
    const gridSize = {{PARAM_GRID_SIZE}} || 4;
    const minCorrectRequired = {{PARAM_MIN_CORRECT}} || 2;
    
    // Create container element
    const container = document.createElement('div');
    container.id = 'captcha-interactive-container';
    container.style.width = '100%';
    container.style.maxWidth = '300px';
    container.style.margin = '0 auto';
    container.style.padding = '15px';
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = '#f9f9f9';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    
    // Add container to document or specified element
    const parentElement = document.getElementById('captcha-graphic') || document.body;
    parentElement.innerHTML = '';
    parentElement.style.display = 'block'; 
    parentElement.appendChild(container);
    
    // Create UI handler
    const ui = new InteractionUI(container, {
      difficulty,
      gridSize,
      seed: ctx.challenge.token
    });
    
    // Run the challenge
    const result = await ui.createPatternCompletionUI({
      difficulty,
      gridSize
    });
    
    // Calculate duration
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Get interaction stats
    const interactionStats = ui.getInteractionStats();
    
    // Create a hash of the result for verification
    let resultHash = '';
    if (ctx.utils && ctx.utils.sha256) {
      const hashInput = JSON.stringify({
        ...result,
        token: ctx.challenge.token,
        duration
      });
      resultHash = await ctx.utils.sha256(hashInput);
    }
    
    // Success criteria:
    // 1. Must have made correct selections above the minimum required threshold
    // 2. Must have some interaction stats indicating human behavior
    const success = result.correctPositions >= minCorrectRequired &&
                    interactionStats.moveCount > 5 &&
                    interactionStats.completionTime > 0;
    
    // Hide the container now that the test is complete
    setTimeout(() => {
      parentElement.style.display = 'none';
    }, 1000);
    
    return {
      type: 'interactive_pattern_completion',
      success,
      verificationHash: resultHash.substring(0, 16),
      correctSelections: result.correctPositions,
      totalSelections: result.totalPositions,
      duration,
      interactionStats
    };
  } catch (error) {
    // Report error but continue captcha flow
    console.error("Interactive pattern completion error:", error);
    return {
      type: 'interactive_pattern_completion',
      error: error.message,
      success: false
    };
  }
}
`;

/**
 * Image selection challenge template
 */
const imageSelectionTemplate = `
async function interactive_image_selection_test(ctx) {
  try {
    // Start tracking time
    const startTime = performance.now();
    
    // Extract challenge parameters
    const difficulty = {{PARAM_DIFFICULTY}} || 4;
    const selectionCount = {{PARAM_SELECTION_COUNT}} || 2; 
    const categoryType = "{{PARAM_CATEGORY_TYPE}}" || "shapes";
    
    // Create container element
    const container = document.createElement('div');
    container.id = 'captcha-interactive-container';
    container.style.width = '100%';
    container.style.maxWidth = '350px';
    container.style.margin = '0 auto';
    container.style.padding = '15px';
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = '#f9f9f9';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    
    // Add container to document or specified element
    const parentElement = document.getElementById('captcha-graphic') || document.body;
    parentElement.innerHTML = '';
    parentElement.style.display = 'block';
    parentElement.appendChild(container);
    
    // Create UI handler
    const ui = new InteractionUI(container, {
      difficulty,
      seed: ctx.challenge.token
    });
    
    // Run the challenge - currently, this falls back to pattern completion
    const result = await ui.createImageSelectionUI({
      difficulty,
      categoryType
    });
    
    // Calculate duration
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Get interaction stats
    const interactionStats = ui.getInteractionStats();
    
    // Create a hash of the result for verification
    let resultHash = '';
    if (ctx.utils && ctx.utils.sha256) {
      const hashInput = JSON.stringify({
        ...result,
        token: ctx.challenge.token,
        duration
      });
      resultHash = await ctx.utils.sha256(hashInput);
    }
    
    // Success criteria:
    // 1. Must have made correct selections above threshold
    // 2. Must have some interaction stats indicating human behavior
    const success = result.success && 
                    interactionStats.moveCount > 3 &&
                    interactionStats.completionTime > 0;
    
    // Hide the container now that the test is complete
    setTimeout(() => {
      parentElement.style.display = 'none';
    }, 1000);
    
    return {
      type: 'interactive_image_selection',
      success,
      verificationHash: resultHash.substring(0, 16),
      duration,
      interactionStats
    };
  } catch (error) {
    // Report error but continue captcha flow
    console.error("Interactive image selection error:", error);
    return {
      type: 'interactive_image_selection',
      error: error.message,
      success: false
    };
  }
}
`;

/**
 * Drag and drop puzzle challenge template
 */
const dragPuzzleTemplate = `
async function interactive_drag_puzzle_test(ctx) {
  // This template is a placeholder for future implementation
  // For now, it falls back to using the pattern completion challenge
  
  return interactive_pattern_completion_test(ctx);
}
`;

module.exports = {
  patternCompletionTests,
  imageSelectionTests,
  objectOrientationTests,
  patternCompletionTemplate,
  imageSelectionTemplate,
  dragPuzzleTemplate,
  numberSequenceCompletionTests
};