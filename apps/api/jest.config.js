/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  moduleNameMapper: { '^@tracker/geo$': '<rootDir>/../../../packages/geo/src/index.ts' },
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!**/*.dto.ts', '!main.ts', '!bootstrap.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: { global: { branches: 80, functions: 90, lines: 90, statements: 90 } },
};
