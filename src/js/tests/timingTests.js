const TestType = {
    JAVASCRIPT_EXECUTION_SPEED: 'JavaScript Execution Speed',
    TIMING_CONSISTENCY: 'Timing Consistency',
    EVENT_LOOP_LATENCY: 'Event Loop Latency',
    MEMORY_PERFORMANCE: 'Memory Performance'
};

function JavaScriptExecutionSpeed() {
    let result;
    try {
        const executionTimes = [];
        const iterations = 100000; // Increased iterations
        const runs = 5; // Number of runs for consistency check

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

        result = {
            testType: TestType.JAVASCRIPT_EXECUTION_SPEED,
            result: {
                avgExecutionTime,   // Avg execution time - Should be > 1 and < 500
                stdDev              // To check for consistency - Standard deviation of execution times
            }
        };
    } catch (e) {
        result = {
            testType: TestType.JAVASCRIPT_EXECUTION_SPEED,
            error: e.message
        }
    }
    return result;
}

function TimingConsistency() {
    let result;
    try {
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
        
        result = {
            testType: TestType.TIMING_CONSISTENCY,
            result: {
                avg,    // Avg time taken, stdDev < 0.01 && avg > 0 => Suspiciously consistent timing since Humans show natural variation
                stdDev  // Standard deviation
            }
        };
    } catch (e) {
        result = {
            testType: TestType.TIMING_CONSISTENCY,
            error: e.message
        }
    }
    return result;
}

function EventLoopLatency() {
    let result;
    try {
        const delays = [];
        let iterations = 10;
        let expectedTime = performance.now() + 50; // Schedule 50ms in future

        const checkDelay = () => {
            const actualTime = performance.now();
            delays.push(actualTime - expectedTime);
            iterations--;

            if (iterations > 0) {
                expectedTime += 50;
                setTimeout(checkDelay, 50);
            } else {
                const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
                result = {
                    testType: TestType.EVENT_LOOP_LATENCY,
                    result: {
                        avgDelay    // Avg delay 
                    }
                };
            }
        };

        setTimeout(checkDelay, 50);
    } catch (e) {
        result = {
            testType: TestType.EVENT_LOOP_LATENCY,
            error: e.message
        }
    }
    return result;
}

function MemoryPerformance() {
    let result
    try {
        const memoryTimes = [];
        const memoryIterations = 10; // Number of memory allocation/deallocation cycles

        for (let i = 0; i < memoryIterations; i++) {
            const startTime = performance.now();
            const largeArray = new Array(1000000).fill(0); // Allocate large array
            const endTime = performance.now();
            memoryTimes.push(endTime - startTime);
        }

        const avgMemoryTime = memoryTimes.reduce((a, b) => a + b, 0) / memoryIterations;
        result = {
            testType: TestType.MEMORY_PERFORMANCE,
            result: {
                avgMemoryTime   // Avg memory allocation time
            }
        };
    } catch (e) {
        result = {
            testType: TestType.MEMORY_PERFORMANCE,
            error: e.message
        };
    }
    return result;
}

const timingTests = () => {
    const results = {
        supportsCaptcha: true,
        testResults: []
    };

    // Test 1: JavaScript Execution Speed
    results.testResults.push(JavaScriptExecutionSpeed());
    
    // Test 2: Timing Consistency
    results.testResults.push(TimingConsistency());

    // Test 3: Event Loop Latency
    results.testResults.push(EventLoopLatency());

    // Test 4: Memory Performance
    results.testResults.push(MemoryPerformance());

    return results;
}