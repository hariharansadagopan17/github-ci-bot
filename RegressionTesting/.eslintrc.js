module.exports = {
    env: {
        node: true,
        es2021: true,
        mocha: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-console': 'warn',
        'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        'comma-dangle': ['error', 'never'],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'space-before-function-paren': ['error', 'never'],
        'keyword-spacing': 'error',
        'space-infix-ops': 'error',
        'brace-style': ['error', '1tbs'],
        'curly': 'error'
    },
    globals: {
        'describe': 'readonly',
        'it': 'readonly',
        'before': 'readonly',
        'after': 'readonly',
        'beforeEach': 'readonly',
        'afterEach': 'readonly'
    }
};
