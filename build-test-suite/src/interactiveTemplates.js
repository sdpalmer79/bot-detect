/**
 * Interactive challenge templates
 * These templates are used to generate visual and interactive CAPTCHA challenges
 */

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
            difficulty: PARAM_DIFFICULTULTY,
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
  dragPuzzleTemplate
};