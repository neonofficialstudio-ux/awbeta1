// api/tests/reporters/detailedReporter.ts
import type { TestResult, TestResultSummary } from '../test-runner';

interface DetailedReport {
    summary: {
        passed: number;
        failed: number;
        total: number;
        durationMs: number;
    };
    groups: Record<string, {
        passed: number;
        failed: number;
        total: number;
        tests: { name: string; status: 'PASS' | 'FAIL'; error?: string }[];
    }>;
}

export const detailedReporter = (results: TestResultSummary): DetailedReport => {
    const report: DetailedReport = {
        summary: {
            passed: results.passed,
            failed: results.failed,
            total: results.total,
            durationMs: results.duration,
        },
        groups: {},
    };

    results.results.forEach(result => {
        if (!report.groups[result.group]) {
            report.groups[result.group] = { passed: 0, failed: 0, total: 0, tests: [] };
        }
        
        const group = report.groups[result.group];
        group.total++;
        if (result.status === 'PASS') {
            group.passed++;
        } else {
            group.failed++;
        }

        group.tests.push({
            name: result.name,
            status: result.status,
            error: result.error,
        });
    });

    return report;
};
