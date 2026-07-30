"use strict";

const globals = require("globals");

module.exports = [
    {
        ignores: ["node_modules/**"],
    },
    {
        files: ["src/**/*.js", "scripts/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: globals.node,
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": [
                "error",
                {
                    args: "after-used",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },
    {
        files: ["tests/load/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                __ENV: "readonly",
            },
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": "error",
        },
    },
];
