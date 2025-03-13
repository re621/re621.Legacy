import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    plugins: {
      "@stylistic": stylistic,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        $: false,
        Danbooru: false,
      },
      parser: parser,
      parserOptions: {
        ecmaVersion: "latest",
      },
    },
    rules: {
      // "no-unused-vars": "off",
      // "@stylistic/ts/no-unused-vars": [ "warn", { "argsIgnorePattern": "^_" } ],

      // https://eslint.style/packages/js
      "@stylistic/array-bracket-newline": "warn",
      "@stylistic/array-bracket-spacing": "off",
      "@stylistic/array-element-newline": ["warn", "consistent"],
      "@stylistic/arrow-parens": "off",
      "@stylistic/arrow-spacing": "warn",
      "@stylistic/block-spacing": "warn",
      "@stylistic/brace-style": ["warn", "1tbs", { allowSingleLine: true }],
      "@stylistic/comma-dangle": ["warn", "always-multiline"],
      "@stylistic/comma-spacing": "warn",
      "@stylistic/comma-style": "warn",
      "@stylistic/computed-property-spacing": "warn",
      "@stylistic/dot-location": ["warn", "property"],
      "@stylistic/eol-last": "warn",
      "@stylistic/function-call-argument-newline": ["warn", "consistent"],
      "@stylistic/func-call-spacing": "warn",  // function-call-spacing does not work ???
      "@stylistic/implicit-arrow-linebreak": "warn",
      "@stylistic/indent": "off", // TODO Refactor ["warn", 2, { SwitchCase: 1, }],
      "@stylistic/key-spacing": ["warn", { mode: "minimum" }],
      "@stylistic/keyword-spacing": "warn",
      "@stylistic/line-comment-position": "off",
      "@stylistic/linebreak-style": "off", // TODO Refactor
      "@stylistic/lines-around-comment": "off",
      "@stylistic/lines-between-class-members": "warn",
      // "max-len": ["warn", { code: 100, tabWidth: 2, ignoreComments: true }], // Might get annoying, see https://eslint.style/rules/js/max-len
      "@stylistic/max-statements-per-line": ["warn", { max: 2 }],
      "@stylistic/multiline-comment-style": "off",
      "@stylistic/multiline-ternary": ["warn", "always-multiline"],
      "@stylistic/new-parens": "warn",
      "@stylistic/newline-per-chained-call": "off",
      "@stylistic/no-confusing-arrow": "warn",
      "@stylistic/no-extra-parens": "off",
      "@stylistic/no-extra-semi": "warn",
      "@stylistic/no-floating-decimal": "warn",
      "@stylistic/no-mixed-operators": "error",
      "@stylistic/no-mixed-spaces-and-tabs": "error",
      "@stylistic/no-multi-spaces": ["warn", { ignoreEOLComments: true }],
      "@stylistic/no-multiple-empty-lines": "warn",
      "@stylistic/no-tabs": "warn",
      "@stylistic/no-trailing-spaces": "warn",
      "@stylistic/no-whitespace-before-property": "warn",
      "@stylistic/nonblock-statement-body-position": "off",
      "@stylistic/object-curly-newline": ["warn", { consistent: true }],
      "@stylistic/one-var-declaration-per-line": "off",
      "@stylistic/operator-linebreak": ["warn", "before"],
      "@stylistic/padded-blocks": "off",
      "@stylistic/padding-line-between-statements": "off",
      "@stylistic/quote-props": ["warn", "consistent"],
      "@stylistic/quotes": ["warn", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
      "@stylistic/rest-spread-spacing": "warn",
      "@stylistic/semi": "warn",
      "@stylistic/semi-spacing": "warn",
      "@stylistic/semi-style": "warn",
      "@stylistic/space-before-blocks": "warn",
      "@stylistic/space-before-function-paren": "warn", // good idea?
      "@stylistic/space-in-parens": "warn",
      "@stylistic/space-infix-ops": "warn",
      "@stylistic/space-unary-ops": "warn",
      "@stylistic/spaced-comment": "warn",
      "@stylistic/switch-colon-spacing": "warn",
      "@stylistic/template-curly-spacing": "warn",
      "@stylistic/template-tag-spacing": "warn",
    },
  },
];
