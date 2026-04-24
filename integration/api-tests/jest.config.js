/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
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