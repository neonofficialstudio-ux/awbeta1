// api/admin/testControls.ts
import { runAllTests, getLastTestRun } from '../tests/test-runner';
import { summaryReporter } from '../tests/reporters/summaryReporter';
import { detailedReporter } from '../tests/reporters/detailedReporter';

export const adminRunAllTests = async () => {
    const results = await runAllTests();
    return detailedReporter(results);
};

export const adminGetTestSummary = async () => {
    const lastRun = getLastTestRun() ?? await runAllTests();
    return summaryReporter(lastRun);
};

export const adminGetTestDetails = async () => {
    const lastRun = getLastTestRun() ?? await runAllTests();
    return detailedReporter(lastRun);
};