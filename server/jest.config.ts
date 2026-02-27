import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/__tests__/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  moduleNameMapper: {},
  silent: false,
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
  testTimeout: 10000,
};

export default config;
