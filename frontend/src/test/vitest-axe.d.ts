// Declaration-merging into vitest's Assertion<T>; the generic and `any` must
// match the upstream signature exactly, so the lint exceptions are local
// and intentional.
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): void;
  }
}
