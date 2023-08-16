module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    root: true,
    env: {
        "node": true,
        "es6": true,
    },
    ignorePatterns: ["/bin/*.js", "/test/*.js", "/dist/*", "webpack.config.js"],
    rules: {
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-namespace": "off",
        "no-async-promise-executor": "off",
        "no-empty": "off",
    }
};
