import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    // Fixa o fuso da suíte (America/Bahia); ver o comentário em jest.global-setup.js.
    globalSetup: '<rootDir>/jest.global-setup.js',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
        '^@/(.*)$': '<rootDir>/resources/js/$1',
    },
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
            },
        ],
    },
    testMatch: ['<rootDir>/resources/js/**/*.test.(ts|tsx)'],
};

export default config;
