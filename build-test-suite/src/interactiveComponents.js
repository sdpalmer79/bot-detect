/**
 * Interactive CAPTCHA Components
 * 
 * This file contains the core classes for interactive CAPTCHA challenges:
 * - PatternGenerator: Generates visual patterns based on different algorithms
 * - InteractionUI: Handles user interface elements and user interactions
 */

/**
 * Generates visual patterns for interactive challenges
 */
class PatternGenerator {
  /**
   * Create a new pattern generator
   * @param {Object} options - Configuration options
   * @param {string} options.seed - Seed for deterministic pattern generation
   * @param {number} options.complexity - Pattern complexity (1-10)
   */
  constructor(options = {}) {
    this.seed = options.seed || String(Date.now());
    this.complexity = options.complexity || 5;
    this.rng = this.createSeededRandom(this.seed);
  }
  
  /**
   * Creates a seeded random number generator
   * @param {string} seed - Seed string
   * @returns {Function} Random number generator function
   */
  createSeededRandom(seed) {
    // Simple seedable PRNG
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Mulberry32 algorithm
    return function() {
      let t = hash += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  
  /**
   * Generates a grid pattern for completion challenges
   * @param {Object} options - Generation options
   * @param {number} options.gridSize - Size of grid (e.g., 4 for 4x4)
   * @param {number} options.difficulty - Difficulty level (1-10)
   * @returns {Object} Pattern data with solution
   */
  generateGridPattern(options = {}) {
    const gridSize = options.gridSize || 4;
    const difficulty = options.difficulty || this.complexity;
    
    // Initialize empty grid
    const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    
    // Determine pattern type based on difficulty
    const patternType = Math.floor(this.rng() * 4); // 0-3 different patterns
    
    // Generate pattern based on type
    switch (patternType) {
      case 0: // Symmetrical pattern
        this.generateSymmetricalPattern(grid, difficulty);
        break;
      case 1: // Sequential pattern
        this.generateSequentialPattern(grid, difficulty);
        break;
      case 2: // Alternating pattern
        this.generateAlternatingPattern(grid, difficulty);
        break;
      case 3: // Random with rules pattern
        this.generateRulesBasedPattern(grid, difficulty);
        break;
    }
    
    // Calculate solution (which cells should be marked)
    const solution = this.calculateSolution(grid, patternType);
    
    // Create incomplete pattern by removing solution cells
    const challenge = this.createChallenge(grid, solution);
    
    return {
      grid: challenge,
      solution: solution,
      patternType,
      difficulty
    };
  }
  
  /**
   * Generate a symmetrical pattern in the grid
   */
  generateSymmetricalPattern(grid, difficulty) {
    const size = grid.length;
    const halfSize = Math.floor(size/2);
    
    // Generate pattern in one quadrant
    for (let y = 0; y < halfSize; y++) {
      for (let x = 0; x < halfSize; x++) {
        // More complex patterns with higher difficulty
        if (this.rng() < 0.3 + (difficulty * 0.05)) {
          grid[y][x] = 1;
          
          // Mirror horizontally and vertically for symmetry
          grid[y][size-1-x] = 1;
          grid[size-1-y][x] = 1;
          grid[size-1-y][size-1-x] = 1;
        }
      }
    }
    
    // For odd-sized grids, handle the middle row/column
    if (size % 2 !== 0) {
      const mid = Math.floor(size/2);
      
      // Middle row
      for (let x = 0; x < halfSize; x++) {
        if (this.rng() < 0.4) {
          grid[mid][x] = 1;
          grid[mid][size-1-x] = 1;
        }
      }
      
      // Middle column
      for (let y = 0; y < halfSize; y++) {
        if (this.rng() < 0.4) {
          grid[y][mid] = 1;
          grid[size-1-y][mid] = 1;
        }
      }
      
      // Center piece
      if (this.rng() < 0.5) {
        grid[mid][mid] = 1;
      }
    }
  }
  
  /**
   * Generate a sequential pattern in the grid
   */
  generateSequentialPattern(grid, difficulty) {
    const size = grid.length;
    let x = Math.floor(this.rng() * size);
    let y = Math.floor(this.rng() * size);
    
    // Number of steps determined by difficulty
    const steps = Math.floor(size * size * (0.2 + (difficulty * 0.05)));
    
    const directions = [
      [0, 1],  // down
      [1, 0],  // right
      [0, -1], // up
      [-1, 0]  // left
    ];
    
    // Create a path
    for (let i = 0; i < steps; i++) {
      // Mark current position
      grid[y][x] = 1;
      
      // Choose a random direction
      const dir = directions[Math.floor(this.rng() * directions.length)];
      
      // Try to move in that direction if possible
      const newX = x + dir[0];
      const newY = y + dir[1];
      
      // Check bounds
      if (newX >= 0 && newX < size && newY >= 0 && newY < size) {
        x = newX;
        y = newY;
      }
    }
  }
  
  /**
   * Generate alternating pattern in the grid
   */
  generateAlternatingPattern(grid, difficulty) {
    const size = grid.length;
    
    // Choose whether to start with 0 or 1
    let start = this.rng() < 0.5 ? 0 : 1;
    
    // Basic alternating pattern (checkerboard)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // More complexity with increasing difficulty
        if (difficulty < 5) {
          // Simple checkerboard
          grid[y][x] = (x + y) % 2 === start ? 1 : 0;
        } else {
          // More complex patterns
          const pattern = Math.floor(this.rng() * 3); // 3 different patterns
          
          switch (pattern) {
            case 0: // Diagonal stripes
              grid[y][x] = ((x + y) % 3 === start) ? 1 : 0;
              break;
            case 1: // Checkered squares
              grid[y][x] = ((Math.floor(y/2) + Math.floor(x/2)) % 2 === start) ? 1 : 0;
              break;
            case 2: // Sierpinski-like fractal
              grid[y][x] = ((x & y) === 0) ? 1 : 0;
              break;
          }
        }
      }
    }
    
    // Add some randomness based on difficulty
    const randomFactor = 0.05 * difficulty;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (this.rng() < randomFactor) {
          grid[y][x] = 1 - grid[y][x]; // Flip the value
        }
      }
    }
  }
  
  /**
   * Generate a pattern based on mathematical rules
   */
  generateRulesBasedPattern(grid, difficulty) {
    const size = grid.length;
    const ruleType = Math.floor(this.rng() * 3); // 3 different rule types
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Apply different rules based on the chosen type
        switch (ruleType) {
          case 0: // Prime number related rule
            grid[y][x] = ((x+1) * (y+1)) % (difficulty + 3) === 0 ? 1 : 0;
            break;
          case 1: // Bitwise operations rule
            grid[y][x] = ((x | y) % (difficulty + 2) === 0) ? 1 : 0;
            break;
          case 2: // Distance from center rule
            const centerX = size / 2;
            const centerY = size / 2;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            grid[y][x] = (Math.floor(distance) % (difficulty > 5 ? 3 : 2) === 0) ? 1 : 0;
            break;
        }
      }
    }
  }
  
  /**
   * Calculate which cells should be part of the solution
   */
  calculateSolution(grid, patternType) {
    const size = grid.length;
    const solution = [];
    
    // Different solution strategies based on pattern type
    switch (patternType) {
      case 0: // Symmetrical - identify cells to complete symmetry
        // Find incomplete symmetry
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const mirrorX = size - 1 - x;
            const mirrorY = size - 1 - y;
            
            // If this cell has a filled mirror counterpart but isn't filled itself
            if (grid[y][x] === 0 && (
                (grid[y][mirrorX] === 1) || 
                (grid[mirrorY][x] === 1) || 
                (grid[mirrorY][mirrorX] === 1))) {
              if (this.rng() < 0.7) { // Don't make all symmetry cells part of solution
                solution.push({x, y});
              }
            }
          }
        }
        break;
        
      case 1: // Sequential - identify continuations of the sequence
        // Find cells that continue the pattern
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (grid[y][x] === 0) {
              // Check if surrounded by filled cells
              let filledNeighbors = 0;
              
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  
                  const nx = x + dx;
                  const ny = y + dy;
                  
                  if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === 1) {
                    filledNeighbors++;
                  }
                }
              }
              
              // If cell has 2+ neighbors and passes random check
              if (filledNeighbors >= 2 && this.rng() < 0.4) {
                solution.push({x, y});
              }
            }
          }
        }
        break;
        
      case 2: // Alternating - identify missing alternating cells
      case 3: // Rules - identify cells that should be filled by rule
        // Sample some empty cells to be filled
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (grid[y][x] === 0) {
              // Check neighborhood pattern
              let odd = 0, even = 0;
              
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  
                  if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    if (grid[ny][nx] === 1) {
                      if ((nx + ny) % 2 === 0) even++;
                      else odd++;
                    }
                  }
                }
              }
              
              // If this cell would continue a pattern based on neighbors
              if ((odd > even && (x + y) % 2 === 1) || 
                  (even > odd && (x + y) % 2 === 0)) {
                if (this.rng() < 0.3) {
                  solution.push({x, y});
                }
              }
            }
          }
        }
        break;
    }
    
    // If not enough solution cells, add some randomly
    if (solution.length < 2) {
      const emptyCells = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (grid[y][x] === 0) {
            emptyCells.push({x, y});
          }
        }
      }
      
      // Shuffle and take first few
      this.shuffleArray(emptyCells);
      const extraNeeded = Math.min(3, emptyCells.length);
      for (let i = 0; i < extraNeeded; i++) {
        solution.push(emptyCells[i]);
      }
    }
    
    return solution;
  }
  
  /**
   * Create the challenge by merging grid and solution
   */
  createChallenge(grid, solution) {
    // Create a copy of the grid
    const challenge = JSON.parse(JSON.stringify(grid));
    
    // Remove solution cells from challenge
    for (const cell of solution) {
      challenge[cell.y][cell.x] = 0;
    }
    
    return challenge;
  }
  
  /**
   * Utility to shuffle an array in-place
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

/**
 * Handles UI rendering and user interactions for CAPTCHA challenges
 */
class InteractionUI {
  /**
   * Create a new interactive UI
   * @param {HTMLElement} container - Container element to render UI in
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      difficulty: options.difficulty || 5,
      gridSize: options.gridSize || 4,
      seed: options.seed || String(Date.now()),
      ...options
    };
    
    this.patternGenerator = new PatternGenerator({
      seed: this.options.seed,
      complexity: this.options.difficulty
    });
    
    this.interactionStats = {
      moveCount: 0,
      clickCount: 0,
      hoverTime: 0,
      completionTime: 0,
      startTime: Date.now()
    };
    
    // Bind event handlers
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    
    // Add event listeners to track movement
    document.addEventListener('mousemove', this.handleMouseMove);
  }
  
  /**
   * Track mouse movements for behavioral analysis
   */
  handleMouseMove(event) {
    this.interactionStats.moveCount++;
    
    // Store last position for velocity calculation
    if (!this.lastPosition) {
      this.lastPosition = { x: event.clientX, y: event.clientY, time: Date.now() };
    } else {
      const now = Date.now();
      const dx = event.clientX - this.lastPosition.x;
      const dy = event.clientY - this.lastPosition.y;
      const dt = now - this.lastPosition.time;
      
      // Calculate velocity
      if (dt > 0) {
        const velocity = Math.sqrt(dx*dx + dy*dy) / dt;
        
        // Store velocities for later analysis
        if (!this.velocities) this.velocities = [];
        this.velocities.push(velocity);
      }
      
      this.lastPosition = { x: event.clientX, y: event.clientY, time: now };
    }
  }
  
  /**
   * Handle click events
   */
  handleClick() {
    this.interactionStats.clickCount++;
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    // Remove any other listeners
  }
  
  /**
   * Get collected interaction statistics
   */
  getInteractionStats() {
    // Calculate completion time
    this.interactionStats.completionTime = Date.now() - this.interactionStats.startTime;
    
    // Calculate velocity stats if available
    if (this.velocities && this.velocities.length > 0) {
      const sum = this.velocities.reduce((a, b) => a + b, 0);
      this.interactionStats.avgVelocity = sum / this.velocities.length;
      
      // Calculate variance in velocity (jitter)
      const mean = this.interactionStats.avgVelocity;
      const variance = this.velocities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.velocities.length;
      this.interactionStats.velocityVariance = variance;
    }
    
    return this.interactionStats;
  }
  
  /**
   * Create a pattern completion UI
   * @param {Object} options - UI options
   * @returns {Promise} Resolves with challenge results
   */
  async createPatternCompletionUI(options = {}) {
    const gridSize = options.gridSize || this.options.gridSize;
    const difficulty = options.difficulty || this.options.difficulty;
    
    // Generate pattern
    const patternData = this.patternGenerator.generateGridPattern({
      gridSize,
      difficulty
    });
    
    // Render UI
    this.container.innerHTML = '';
    
    // Create heading
    const heading = document.createElement('h2');
    heading.textContent = 'Complete the pattern';
    heading.style.fontSize = '18px';
    heading.style.margin = '0 0 10px 0';
    heading.style.textAlign = 'center';
    heading.style.color = '#444';
    this.container.appendChild(heading);
    
    // Create instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Click squares to complete the pattern';
    instructions.style.fontSize = '14px';
    instructions.style.margin = '0 0 15px 0';
    instructions.style.textAlign = 'center';
    instructions.style.color = '#666';
    this.container.appendChild(instructions);
    
    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gridContainer.style.gridGap = '4px';
    gridContainer.style.width = '100%';
    gridContainer.style.maxWidth = '250px';
    gridContainer.style.margin = '0 auto';
    this.container.appendChild(gridContainer);
    
    // Create grid cells
    const grid = patternData.grid;
    const cellSize = 100 / gridSize;
    
    // Track selected cells
    const selectedCells = new Set();
    
    // Map solution to string keys for easy checking
    const solutionKeys = new Set(
      patternData.solution.map(pos => `${pos.x},${pos.y}`)
    );
    
    // Create cells
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = document.createElement('div');
        cell.style.width = '100%';
        cell.style.paddingBottom = '100%'; // Square aspect ratio
        cell.style.backgroundColor = grid[y][x] === 1 ? '#3498db' : '#e0e0e0';
        cell.style.borderRadius = '4px';
        cell.style.transition = 'background-color 0.2s ease';
        cell.style.cursor = 'pointer';
        cell.dataset.x = x;
        cell.dataset.y = y;
        
        // Skip filled cells from interaction
        if (grid[y][x] === 1) {
          cell.style.pointerEvents = 'none';
        } else {
          // Add click handler for empty cells
          cell.addEventListener('click', (e) => {
            const cellX = parseInt(e.target.dataset.x);
            const cellY = parseInt(e.target.dataset.y);
            const key = `${cellX},${cellY}`;
            
            // Toggle selection
            if (selectedCells.has(key)) {
              selectedCells.delete(key);
              e.target.style.backgroundColor = '#e0e0e0';
            } else {
              selectedCells.add(key);
              e.target.style.backgroundColor = '#2ecc71';
            }
            
            this.handleClick();
          });
          
          // Track hover time for behavioral analysis
          cell.addEventListener('mouseenter', () => {
            cell.hoverStart = Date.now();
          });
          
          cell.addEventListener('mouseleave', () => {
            if (cell.hoverStart) {
              this.interactionStats.hoverTime += (Date.now() - cell.hoverStart);
              cell.hoverStart = null;
            }
          });
        }
        
        gridContainer.appendChild(cell);
      }
    }
    
    // Add submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Verify';
    submitButton.style.display = 'block';
    submitButton.style.margin = '15px auto 0 auto';
    submitButton.style.padding = '8px 20px';
    submitButton.style.backgroundColor = '#3498db';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.fontWeight = 'bold';
    submitButton.addEventListener('click', this.handleClick);
    this.container.appendChild(submitButton);
    
    // Wait for user to submit
    return new Promise((resolve) => {
      submitButton.addEventListener('click', () => {
        // Calculate result
        const correctPositions = Array.from(selectedCells).filter(key => solutionKeys.has(key)).length;
        const incorrectPositions = selectedCells.size - correctPositions;
        
        // Resolve with result
        resolve({
          correctPositions,
          incorrectPositions,
          totalPositions: solutionKeys.size,
          success: correctPositions >= Math.max(1, Math.floor(solutionKeys.size * 0.7)) && incorrectPositions <= 1
        });
        
        // Clean up
        this.destroy();
      });
    });
  }
  
  /**
   * Create an image selection UI
   * @param {Object} options - UI options
   * @returns {Promise} Resolves with challenge results
   */
  async createImageSelectionUI(options = {}) {
    // For now, fallback to pattern completion until assets are available
    return this.createPatternCompletionUI(options);
  }
}

module.exports = {
  PatternGenerator,
  InteractionUI
};