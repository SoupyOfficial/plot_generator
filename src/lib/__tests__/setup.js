// src/lib/__tests__/setup.js
//
// Test setup file for Vitest + React Testing Library
// This file is automatically loaded before all tests (configured in vite.config.js)

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case (e.g., unmount React trees)
afterEach(() => {
  cleanup();
});
