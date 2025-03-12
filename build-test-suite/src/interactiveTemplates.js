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
          const sequenceParams = deriveSequenceParams(ctx.challenge.seed);
          const { sequence, options } = sequenceParams;
          
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
          
          // Use the pre-shuffled options directly from sequenceParams
          // No need to shuffle again as our deriveSequenceParams already did this deterministically
          
          // Create option buttons
          options.forEach((option, index) => {
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
                challengeId: ctx.challenge.id,
                duration: duration,
                userSelection: selectedOption,
                interactionData: interactionData,
                completionTime: duration
              };
              
              // Sign the result with the proof of work hash
              if (ctx.powHash) {
                // Only include data necessary for verification
                const submissionData = {
                  challengeId: ctx.challenge.id,
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
          
          // Function to derive all sequence parameters from seed
          function deriveSequenceParams(seed) {
            // For this easy test, we'll always generate an arithmetic sequence
            // All parameters are derived from the seed to ensure deterministic results
            
            // Create a simple but deterministic PRNG from the seed
            const prng = createPRNGFromSeed(seed);
            
            // Set difficulty-appropriate parameters for an easy arithmetic sequence
            const sequenceLength = 3 + (prng() % 2); // 3-4 terms in sequence
            const startNumber = 1 + (prng() % 10); // Start with a number between 1-10
            const commonDifference = 1 + (prng() % 5); // Difference of 1-5 between terms
            
            // Generate the sequence
            const sequence = [];
            for (let i = 0; i < sequenceLength; i++) {
              sequence.push(startNumber + (i * commonDifference));
            }
            
            // Calculate correct next value (answer)
            const correctAnswer = startNumber + (sequenceLength * commonDifference);
            
            // Generate plausible incorrect options
            const optionsCount = 3 + (prng() % 3); // 3-5 options total
            const incorrectOptions = generateIncorrectOptions(sequence, correctAnswer, optionsCount - 1, prng);
            
            // Mix the correct answer with incorrect options
            const options = [...incorrectOptions, correctAnswer];
            
            // Shuffle options deterministically
            shuffleArray(options, prng);
            
            // Set visual parameters based on sequence complexity and seed
            const distortionLevel = 1 + (prng() % PARAM_DISTORTION);
            
            // Return parameters (without exposing which answer is correct)
            return {
              sequence,
              options,
              distortion: distortionLevel,
              sequenceType: 'arithmetic' // Always arithmetic for easy difficulty
            };
            
            // Helper function to create a simple PRNG from seed
            function createPRNGFromSeed(seed) {
              // Convert string seed to a number using simple hash
              let numericSeed = 0;
              for (let i = 0; i < seed.length; i++) {
                numericSeed = ((numericSeed << 5) - numericSeed) + seed.charCodeAt(i);
                numericSeed = numericSeed & numericSeed; // Convert to 32bit integer
              }
              
              // Use a simple Linear Congruential Generator
              let state = Math.abs(numericSeed) || 1;
              
              return function() {
                // LCG parameters - using values from Numerical Recipes
                state = (1664525 * state + 1013904223) % 4294967296;
                return state;
              };
            }
            
            // Generate plausible but incorrect answers
            function generateIncorrectOptions(sequence, correctAnswer, count, prng) {
              const options = new Set();
              
              // First incorrect option: off by ±1 (very plausible)
              options.add(correctAnswer + (prng() % 2 ? 1 : -1));
              
              // Second incorrect option: wrong pattern (e.g., multiply instead of add)
              const lastTerm = sequence[sequence.length - 1];
              const secondToLastTerm = sequence[sequence.length - 2];
              
              // Try multiplication instead of addition
              if (secondToLastTerm !== 0) {
                const ratio = Math.round(lastTerm / secondToLastTerm);
                options.add(lastTerm * ratio);
              }
              
              // Try adding the previous two terms (like Fibonacci)
              if (sequence.length > 1) {
                options.add(lastTerm + secondToLastTerm);
              }
              
              // Try doubling the difference
              const diff = lastTerm - secondToLastTerm;
              options.add(lastTerm + (diff * 2));
              
              // Keep generating random options if we don't have enough
              while (options.size < count) {
                // Random number around the correct answer, but not the correct answer
                let randomOption = correctAnswer + ((prng() % 10) - 5);
                if (randomOption !== correctAnswer) {
                  options.add(randomOption);
                }
              }
              
              // Convert to array and take only what we need
              return Array.from(options).slice(0, count);
            }
            
            // Fisher-Yates shuffle using PRNG
            function shuffleArray(array, prng) {
              for (let i = array.length - 1; i > 0; i--) {
                const j = prng() % (i + 1);
                [array[i], array[j]] = [array[j], array[i]];
              }
              return array;
            }
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
        "PARAM_DISTORTION": { min: 1, max: 3, step: 1 }
      }
    }
  ]
}

module.exports = {
  numberSequenceCompletionTests
};