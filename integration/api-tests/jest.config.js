/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testTimeout: 120000,
  globalSetup: './jest-setup.ts',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: "./test-reports",
        outputName: "jest-results.xml"
      }
    ]
  ]
};