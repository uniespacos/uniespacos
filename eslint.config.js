import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

export default typescript.config(
    js.configs.recommended,
    ...typescript.configs.recommended,
    {
        files: ['resources/js/**/*.ts', 'resources/js/**/*.tsx'],
        extends: [...typescript.configs.strictTypeChecked, ...typescript.configs.stylisticTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        files: [
            'resources/js/lib/**/*.{ts,tsx}',
            'resources/js/hooks/**/*.{ts,tsx}',
            'resources/js/contracts/**/*.{ts,tsx}',
            'resources/js/constants/**/*.{ts,tsx}',
            'resources/js/i18n/**/*.{ts,tsx}',
            'resources/js/components/ui/**/*.{ts,tsx}',
        ],
        ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/presentation/*'],
                            message: 'Camadas de infraestrutura/domínio e primitivos UI não podem importar de presentation/.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['resources/js/presentation/atoms/**/*.{ts,tsx}'],
        ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/presentation/molecules/*',
                                '@/presentation/organisms/*',
                                '@/presentation/templates/*',
                                '@/presentation/pages/*',
                            ],
                            message: 'Atoms não podem importar de camadas superiores (molecules, organisms, templates ou pages).',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['resources/js/presentation/molecules/**/*.{ts,tsx}'],
        ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/presentation/organisms/*', '@/presentation/templates/*', '@/presentation/pages/*'],
                            message: 'Molecules não podem importar de camadas superiores (organisms, templates ou pages).',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['resources/js/presentation/organisms/**/*.{ts,tsx}'],
        ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/presentation/templates/*', '@/presentation/pages/*'],
                            message: 'Organisms não podem importar de camadas superiores (templates ou pages).',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['resources/js/presentation/templates/**/*.{ts,tsx}'],
        ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/presentation/pages/*'],
                            message: 'Templates não podem importar de pages/.',
                        },
                    ],
                },
            ],
        },
    },
    {
        ignores: ['vendor', 'node_modules', 'public', 'bootstrap/ssr', 'tailwind.config.js', 'docs'],
    },
    prettier, // Turn off all rules that might conflict with Prettier
    {
        files: ['jest.setup.js', 'jest.global-setup.js', '__mocks__/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
);
