Client-Side CAPTCHA System
A sophisticated bot detection system that uses client-side JavaScript tests to distinguish between human users and automated bots, without requiring traditional image-based CAPTCHA challenges.

Project Overview
This project implements an advanced client-side CAPTCHA system that runs a series of tests in the user's browser to determine if they are likely human or bot. Unlike traditional CAPTCHA implementations that rely on solving visual puzzles, this system uses multiple verification techniques working together:

Browser fingerprinting
WebGL capabilities testing
Token verification with cryptographic challenges
Environment analysis
Behavioral monitoring
Core Concepts
Test Suite Architecture
The system dynamically generates unique test suites for each verification session:

Each suite has a unique ID and configuration
Suites contain a mix of real verification tests and dummy tests
Tests are chained together with hash verification
Results are sent back to the server for evaluation
Server compares client results against expected values
Security Features
The implementation includes multiple layers of security:

Code Obfuscation: Test suite code is obfuscated using javascript-obfuscator to prevent reverse-engineering
Anti-Debugging: Runtime protections detect when code is being analyzed in dev tools
Proof of Work: Requires computational effort from the client
Test Chaining: Tests depend on previous results, preventing selective execution
Server Verification: All results are verified server-side against expected values

Verification Flow
Client requests a challenge from the server
Server generates a unique test suite and challenge
Client loads and executes the test suite
Suite runs multiple tests and collects environment data
Results are submitted back to server
Server verifies results and makes a human/bot determination

Key Components
Test Types
tokenTests: Cryptographic challenges with multi-round token verification
webglTests: GPU fingerprinting and capability verification
environmentTests: Browser environment profiling
timingTests: Execution timing patterns analysis
networkTests: Analysis of network capabilities
interactionTests: User interaction pattern verification
automationTests: Detection of automation frameworks


Test template implementation Guidelines:

Core Architecture Guidelines
Single Parameter: Each test function must have only ONE parameter (ctx):
async function TEST_FUNCTION_NAME(ctx) { ... }

Challenge Data Access: Access challenge properties through the ctx.challenge object:
const token = ctx.challenge.token || "";  // Correct
const timestamp = ctx.challenge.timestamp || 0;

Focused Responsibility: Each test should have one clear purpose and not overlap with other test categories

Token tests: Only verify token integrity
Automation tests: Only detect automation signals
Environment tests: Only gather environment data
Proper Async/Await: Any function using await must be declared with async

Implementation Requirements

Reliable Type Handling: Use explicit string conversions to ensure cross-environment consistency:
digest = await sha256(String(value) + result);

Self-Contained: Include necessary helper functions within the test

Defensive Programming: Handle edge cases and include try/catch blocks

Consistent Math: Use explicit Math operations like Math.floor() when needed

Debugging Support: Include appropriate debug logs at critical points
Return Value Standardization
Standard Format: Return structured data with standardized top-level properties appropriate to the test type

Proper Error Format:
return {
  error: "Test failed",
  errorMessage: error.message
};
This understanding ensures we'll implement tests correctly based on the actual structure of the ctx object, where challenge data is nested under ctx.challenge rather than at the top level of ctx.