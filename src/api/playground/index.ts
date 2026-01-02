// api/playground/index.ts
import * as simulateEconomy from './simulateEconomy';
import * as simulateMissions from './simulateMissions';
import * as simulateStore from './simulateStore';
import * as simulateQueue from './simulateQueue';
import * as generateTestUsers from './generateTestUsers';

/**
 * ADMIN TEST PLAYGROUND
 * 
 * This module provides a suite of pure functions to simulate various aspects of the
 * Artist World application without altering the actual mock database. It's intended for
 * internal testing and validation of the game's economy and logic flows.
 * 
 * How to use (example from browser console):
 * 1. Import the playground: `const playground = await import('./api/playground');`
 * 2. Generate test users: `const testUsers = playground.generateTestUsers.generateTestUsers();`
 * 3. Simulate an action: `const result = playground.simulateEconomy.simulateDailyCheckIn(testUsers[0], 7);`
 * 4. Log the result: `console.log(result);`
 */
export {
  simulateEconomy,
  simulateMissions,
  simulateStore,
  simulateQueue,
  generateTestUsers,
};
