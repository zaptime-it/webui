/**
 * Vitest setup file. Registers jest-dom matchers (`toBeInTheDocument`,
 * `toHaveAttribute`, `toBeVisible`, …) so component specs can assert
 * against rendered DOM without re-importing the matchers in every file.
 * Referenced from `vite.config.ts` → `test.setupFiles`.
 */
import '@testing-library/jest-dom/vitest';
