// api/tests/reporters/summaryReporter.ts
import type { TestResultSummary } from '../test-runner';

export const summaryReporter = (results: TestResultSummary) => {
    return {
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        durationMs: results.duration,
    };
};
