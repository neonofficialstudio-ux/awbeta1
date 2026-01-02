// api/tests/test-runner.ts
import { economyTests } from './test-cases/economy-tests';
import { missionTests } from './test-cases/mission-tests';
import { storeTests } from './test-cases/store-tests';
import { queueTests } from './test-cases/queue-tests';
import { validationTests } from './test-cases/validation-tests';

export interface TestResult {
  group: string;
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  duration: number; // in ms
}

export interface TestDefinition {
  name: string;
  fn: () => void | boolean | Promise<void | boolean>;
}

export interface TestResultSummary {
  passed: number;
  failed: number;
  total: number;
  duration: number;
  results: TestResult[];
}

let lastRunResults: TestResultSummary | null = null;

const runTest = async (groupName: string, test: TestDefinition): Promise<TestResult> => {
    const startTime = Date.now();
    try {
        const result = await test.fn();
        if (result === false) {
            throw new Error('Test returned false');
        }
        return {
            group: groupName,
            name: test.name,
            status: 'PASS',
            duration: Date.now() - startTime,
        };
    } catch (e: any) {
        return {
            group: groupName,
            name: test.name,
            status: 'FAIL',
            error: e.message || 'Unknown error',
            duration: Date.now() - startTime,
        };
    }
};

const runTestGroup = async (groupName: string, tests: TestDefinition[]): Promise<TestResult[]> => {
    const results = [];
    for (const test of tests) {
        results.push(await runTest(groupName, test));
    }
    return results;
};

export const runAllTests = async (): Promise<TestResultSummary> => {
    const allTestGroups = {
        'Economy': economyTests,
        'Missions': missionTests,
        'Store': storeTests,
        'Queues': queueTests,
        'Validation': validationTests,
    };
    
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const groupName in allTestGroups) {
        // @ts-ignore
        const groupTests = allTestGroups[groupName] as TestDefinition[];
        results.push(...(await runTestGroup(groupName, groupTests)));
    }

    const summary: TestResultSummary = {
        passed: results.filter(r => r.status === 'PASS').length,
        failed: results.filter(r => r.status === 'FAIL').length,
        total: results.length,
        duration: Date.now() - startTime,
        results: results,
    };

    lastRunResults = summary;
    return summary;
};

export const getLastTestRun = (): TestResultSummary | null => {
    return lastRunResults;
};