// https://docs.expo.dev/guides/using-eslint/
/* global __dirname */
const { FlatCompat } = require('@eslint/eslintrc');
const { defineConfig } = require('eslint/config');
const path = require('path');
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: path.dirname(require.resolve('eslint-config-expo/package.json')),
});

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'admin-web/**'],
  },
  ...compat.extends('eslint-config-expo'),
  {
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]);
