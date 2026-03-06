import eslint from '@eslint/js';
import globals from 'globals';
import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export function createEslintConfig(tsconfigRootDir: string): ReturnType<typeof tseslint.config> {
  const typeScriptFiles = [
    'src/**/*.ts',
    '__tests__/**/*.ts',
    'eslint.config.mts',
  ];

  return tseslint.config(
    globalIgnores([
      '**/*.cjs',
      '**/*.js',
      '**/*.mjs',
      'dist/**',
      'templates/**',
    ]),
    {
      extends: [
        eslint.configs.recommended,
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
      ],
      files: typeScriptFiles,
      languageOptions: {
        globals: {
          ...globals.node,
        },
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/explicit-member-accessibility': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            args: 'all',
            argsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            ignoreRestSiblings: true,
            varsIgnorePattern: '^_',
          },
        ],
        '@typescript-eslint/prefer-readonly': 'error',
        'curly': 'error',
        'eqeqeq': 'error',
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-template': 'error',
      },
    },
  );
}
