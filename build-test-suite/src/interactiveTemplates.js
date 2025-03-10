/**
 * Interactive visual CAPTCHA templates
 * These templates provide interactive challenges that are triggered
 * when automatic tests indicate a potential bot or when higher verification 
 * confidence is required.
 */

const patternCompletionTests = {
  category: "patternCompletionTests",
  variations: [
    {
      id: "pattern_completion_easy",
      description: "Pattern completion challenge with simple patterns and fewer options",
      difficultyLevel: 1,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Extract challenge parameters
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          // Generate a unique seed for this challenge
          const uniqueSeed = timestamp + '_' + challengeId;
          
          // Initialize the result object
          const result = {
            challengeType: "pattern_completion",
            challengeId: challengeId,
            timestamp: timestamp,
            interactionData: {},
            renderingInfo: {},
            success: false,
            userInteractions: []
          };
          
          // Create the container for the visual challenge
          const captchaGraphic = document.getElementById('captcha-graphic');
          if (!captchaGraphic) {
            throw new Error("Captcha graphic container not found");
          }
          
          // Show the container and prepare it
          captchaGraphic.style.display = 'block';
          captchaGraphic.innerHTML = '';
          
          // Create WebGL canvas
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 200;
          captchaGraphic.appendChild(canvas);
          
          // Setup WebGL context and draw pattern
          const patternGenerator = new PatternGenerator(canvas, uniqueSeed);
          const pattern = await patternGenerator.generateEasyPattern();
          
          // Create UI elements for user interaction
          const interactionElements = new InteractionUI(captchaGraphic, pattern);
          const interactionResult = await interactionElements.createEasyOptions(3); // Only 3 options
          
          // Record interaction data and result
          result.interactionData = interactionResult.data;
          result.success = interactionResult.success;
          result.userInteractions = interactionResult.interactions;
          result.completionTime = interactionResult.completionTime;
          
          return result;
        } catch (error) {
          console.error("Visual challenge error:", error);
          return {
            error: "Visual challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    },
    {
      id: "pattern_completion_medium",
      description: "Pattern completion challenge with moderate complexity and more options",
      difficultyLevel: 5,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Extract challenge parameters
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          // Generate a unique seed for this challenge
          const uniqueSeed = timestamp + '_' + challengeId;
          
          // Initialize the result object
          const result = {
            challengeType: "pattern_completion",
            challengeId: challengeId,
            timestamp: timestamp,
            interactionData: {},
            renderingInfo: {},
            success: false,
            userInteractions: []
          };
          
          // Create the container for the visual challenge
          const captchaGraphic = document.getElementById('captcha-graphic');
          if (!captchaGraphic) {
            throw new Error("Captcha graphic container not found");
          }
          
          // Show the container and prepare it
          captchaGraphic.style.display = 'block';
          captchaGraphic.innerHTML = '';
          
          // Create WebGL canvas
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 200;
          captchaGraphic.appendChild(canvas);
          
          // Setup WebGL context and draw pattern
          const patternGenerator = new PatternGenerator(canvas, uniqueSeed);
          const pattern = await patternGenerator.generateMediumPattern();
          
          // Create UI elements for user interaction
          const interactionElements = new InteractionUI(captchaGraphic, pattern);
          const interactionResult = await interactionElements.createMediumOptions(5); // 5 options
          
          // Record interaction data and result
          result.interactionData = interactionResult.data;
          result.success = interactionResult.success;
          result.userInteractions = interactionResult.interactions;
          result.completionTime = interactionResult.completionTime;
          
          return result;
        } catch (error) {
          console.error("Visual challenge error:", error);
          return {
            error: "Visual challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    },
    {
      id: "pattern_completion_hard",
      description: "Pattern completion challenge with complex patterns and many similar options",
      difficultyLevel: 9,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Extract challenge parameters
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          // Generate a unique seed for this challenge
          const uniqueSeed = timestamp + '_' + challengeId;
          
          // Initialize the result object
          const result = {
            challengeType: "pattern_completion",
            challengeId: challengeId,
            timestamp: timestamp,
            interactionData: {},
            renderingInfo: {},
            success: false,
            userInteractions: []
          };
          
          // Create the container for the visual challenge
          const captchaGraphic = document.getElementById('captcha-graphic');
          if (!captchaGraphic) {
            throw new Error("Captcha graphic container not found");
          }
          
          // Show the container and prepare it
          captchaGraphic.style.display = 'block';
          captchaGraphic.innerHTML = '';
          
          // Create WebGL canvas
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 200;
          captchaGraphic.appendChild(canvas);
          
          // Setup WebGL context and draw pattern
          const patternGenerator = new PatternGenerator(canvas, uniqueSeed);
          const pattern = await patternGenerator.generateHardPattern();
          
          // Create UI elements for user interaction
          const interactionElements = new InteractionUI(captchaGraphic, pattern);
          const interactionResult = await interactionElements.createHardOptions(7); // 7 options, many similar
          
          // Record interaction data and result
          result.interactionData = interactionResult.data;
          result.success = interactionResult.success;
          result.userInteractions = interactionResult.interactions;
          result.completionTime = interactionResult.completionTime;
          
          return result;
        } catch (error) {
          console.error("Visual challenge error:", error);
          return {
            error: "Visual challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    }
  ]
};

const imageSelectionTests = {
  category: "imageSelectionTests",
  variations: [
    {
      id: "image_selection_easy",
      description: "Simple image selection challenge with clear differences",
      difficultyLevel: 2,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Implementation will be provided when ready
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          return {
            challengeType: "image_selection",
            difficultyLevel: 2,
            seed: challengeId.substring(0, 8),
            success: false,
            error: "Not implemented yet"
          };
        } catch (error) {
          console.error("Image selection challenge error:", error);
          return {
            error: "Image selection challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    },
    {
      id: "image_selection_medium",
      description: "Moderate image selection challenge with multiple target objects",
      difficultyLevel: 5,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Implementation will be provided when ready
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          return {
            challengeType: "image_selection",
            difficultyLevel: 5,
            seed: challengeId.substring(0, 8),
            success: false,
            error: "Not implemented yet"
          };
        } catch (error) {
          console.error("Image selection challenge error:", error);
          return {
            error: "Image selection challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    },
    {
      id: "image_selection_hard",
      description: "Complex image selection challenge with subtle differences",
      difficultyLevel: 8,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Implementation will be provided when ready
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          return {
            challengeType: "image_selection",
            difficultyLevel: 8,
            seed: challengeId.substring(0, 8),
            success: false,
            error: "Not implemented yet"
          };
        } catch (error) {
          console.error("Image selection challenge error:", error);
          return {
            error: "Image selection challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    }
  ]
};

const objectOrientationTests = {
  category: "objectOrientationTests",
  variations: [
    {
      id: "object_orientation_easy",
      description: "Rotate a 3D object to match a simple target orientation",
      difficultyLevel: 3,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Implementation will be provided when ready
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          return {
            challengeType: "object_orientation",
            difficultyLevel: 3,
            seed: challengeId.substring(0, 8),
            success: false,
            error: "Not implemented yet"
          };
        } catch (error) {
          console.error("3D object challenge error:", error);
          return {
            error: "3D object challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    },
    {
      id: "object_orientation_hard",
      description: "Rotate a complex 3D object to match a specific orientation",
      difficultyLevel: 7,
      code: `async function TEST_FUNCTION_NAME(ctx) {
        try {
          // Implementation will be provided when ready
          const challengeId = ctx.challenge.id || "";
          const timestamp = ctx.challenge.timestamp || 0;
          
          return {
            challengeType: "object_orientation",
            difficultyLevel: 7,
            seed: challengeId.substring(0, 8),
            success: false,
            error: "Not implemented yet"
          };
        } catch (error) {
          console.error("3D object challenge error:", error);
          return {
            error: "3D object challenge failed",
            errorMessage: error.message
          };
        }
      }`,
      paramRanges: {}
    }
  ]
};

module.exports = {
  patternCompletionTests,
  imageSelectionTests,
  objectOrientationTests
};