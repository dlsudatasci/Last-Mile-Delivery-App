// For testing only
module.exports = {
    preset: "jest-expo",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testEnvironment: "node",
    testMatch: [
        "**/__tests__/**/*.test.ts",
        "**/__tests__/**/*.test.tsx"
    ]

};