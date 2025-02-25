const browserTests = () => {
    const results = {
        'general': {
            supportsCaptcha: true,
            testResults: []
        }
    };

    // Test 1: JavaScript Execution Speed
    try {
        const startTime = performance.now();
        let counter = 0;
        for (let i = 0; i < 10000; i++) {
            counter++;
        }
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        // Most human browsers complete this in under 5ms
        if (executionTime < 0.1) {
            results.general.testResults.push('Suspiciously fast execution time: ' + executionTime.toFixed(2) + 'ms');
            results.general.supportsCaptcha = false;
        } else if (executionTime > 50) {
            results.general.testResults.push('Unusually slow execution time: ' + executionTime.toFixed(2) + 'ms');
        } else {
            results.general.testResults.push('Normal execution time: ' + executionTime.toFixed(2) + 'ms');
        }
    } catch (e) {
        results.general.testResults.push('Error in execution timing test: ' + e.message);
        results.general.supportsCaptcha = false;
    }

    // Test 2: Timing Consistency
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
        
        // Humans show natural variation
        if (stdDev < 0.01 && avg > 0) {
            results.general.testResults.push('Suspiciously consistent timing: StdDev=' + stdDev.toFixed(4));
            results.general.supportsCaptcha = false;
        } else {
            results.general.testResults.push('Normal timing variation: StdDev=' + stdDev.toFixed(4));
        }
    } catch (e) {
        results.general.testResults.push('Error in timing consistency test: ' + e.message);
    }

    return results;
};

// Run the browser tests
const testResults = browserTests();
