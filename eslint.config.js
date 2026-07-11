import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // deliberate: recharts tooltip props and raw fetch response bodies are
      // typed loosely on purpose across this codebase
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]

export default eslintConfig
