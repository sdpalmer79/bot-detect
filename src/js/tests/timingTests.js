const TestType = {
    JAVASCRIPT_EXECUTION_SPEED: 'javaScriptExecutionSpeed',
    TIMING_CONSISTENCY: 'timingConsistency',
    EVENT_LOOP_LATENCY: 'eventLoopLatency',
    MEMORY_PERFORMANCE: 'memoryPerformance'
};

/**
 * Tests raw JavaScript execution speed by repeatedly incrementing a counter
 * 
 * Purpose: Measures the raw computational speed of the JavaScript engine
 * Bot Detection: Identifies unnaturally fast execution (headless browsers,
 * custom JavaScript engines) or extremely slow execution (certain automation tools).
 * Bots often have either much faster or much slower execution than standard browsers.
 */
function checkJavaScriptExecutionSpeed() {
    const executionTimes = [];
    const iterations = 100000;
    const runs = 5;

    for (let run = 0; run < runs; run++) {
        const startTime = performance.now();
        let counter = 0;
        for (let i = 0; i < iterations; i++) {
            counter++;
        }
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
    }

    const avgExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / runs;
    const squareDiffs = executionTimes.map(value => Math.pow(value - avgExecutionTime, 2));
    const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / runs);

    return { 
        avgExecutionTime,
        stdDev
    };
}

/**
 * Measures consistency in operation timing across multiple runs
 * 
 * Purpose: Evaluates the natural variability of execution times
 * Bot Detection: Identifies automation with unnatural timing consistency.
 * Human browsers show natural variation in execution times due to background
 * processes, whereas bots and automated testing tools often display
 * suspiciously consistent timing patterns.
 */
function checkTimingConsistency() {
    const timings = [];
    for (let i = 0; i < 5; i++) {
        const start = performance.now();
        let sum = 0;
        for (let j = 0; j < 5000; j++) {
            sum += j;
        }
        const end = performance.now();
        timings.push(end - start);
    }
    
    // Calculate standard deviation of timings
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const squareDiffs = timings.map(value => Math.pow(value - avg, 2));
    const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / timings.length);
    
    return{
        avg,
        stdDev
    };
}

/**
 * Tests JavaScript event loop behavior by measuring setTimeout accuracy
 * 
 * Purpose: Evaluates the delay between scheduled and actual execution times
 * Bot Detection: Identifies environments with abnormal event loop characteristics.
 * Headless browsers, browser automation tools, and virtual environments often
 * show different event loop timing patterns compared to standard browsers.
 * Some bots attempt to control or modify the timing API to evade detection.
 */
async function checkEventLoopLatency() {
    const delays = [];
    let iterations = 10;
    let expectedTime = performance.now() + 50;

    const avgDelay = await new Promise((resolve) => {
        const computeDelay = () => {
            const actualTime = performance.now();
            delays.push(actualTime - expectedTime);
            iterations--;

            if (iterations > 0) {
                expectedTime += 50;
                setTimeout(computeDelay, 50);
            } else {
                const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
                resolve(avgDelay)
            }
        }
        setTimeout(computeDelay, 50);
    });
    return { avgDelay };
}

/**
 * Tests performance of memory allocation operations
 * 
 * Purpose: Measures the speed of allocating large arrays in memory
 * Bot Detection: Identifies environments with unusual memory behavior.
 * Containerized environments, headless browsers, and certain automation
 * tools have different memory allocation characteristics compared to
 * standard browsers. Some bots run with constrained memory resources
 * or in virtualized environments that affect allocation performance.
 */
function checkMemoryPerformance() {
    const memoryTimes = [];
    const memoryIterations = 10; // Number of memory allocation/deallocation cycles

    for (let i = 0; i < memoryIterations; i++) {
        const startTime = performance.now();
        let largeArray = new Array(1000000).fill(0); // Allocate large array
        const endTime = performance.now();
        memoryTimes.push(endTime - startTime);
        largeArray = null;
    }

    const avgMemoryTime = memoryTimes.reduce((a, b) => a + b, 0) / memoryIterations;
    return { avgMemoryTime };
}

async function runTest(testType, testFn) {
    const testResult = { testType, result: null, error: null };
    try {
        testResult.result = await testFn();
    } catch (e) {
        testResult.error = e.message;
    }
    return testResult;
}

export const timingTests = async () => {
    const results = {
        supportsCaptcha: true,
        testResults: []
    };

    results.testResults.push(await runTest(TestType.JAVASCRIPT_EXECUTION_SPEED, checkJavaScriptExecutionSpeed));
    results.testResults.push(await runTest(TestType.TIMING_CONSISTENCY, checkTimingConsistency));
    results.testResults.push(await runTest(TestType.EVENT_LOOP_LATENCY, checkEventLoopLatency));
    results.testResults.push(await runTest(TestType.MEMORY_PERFORMANCE, checkMemoryPerformance));
    return results;
}