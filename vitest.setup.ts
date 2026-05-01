/**
 * Vitest 글로벌 setup.
 *
 * jest-dom matcher / DOM 폴리필은 jsdom 이 활성화된 컴포넌트 테스트에서만
 * 의미 있다. 단위 테스트(node env) 에선 import 자체가 hang 의 원인이 될 수
 * 있어 동적 import + 환경 검사로 분기.
 */

if (typeof window !== 'undefined') {
  // 컴포넌트 테스트 (`// @vitest-environment jsdom` pragma) 에서만 실행.
  await import('@testing-library/jest-dom/vitest');

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    // @ts-expect-error — jsdom polyfill
    globalThis.ResizeObserver = ResizeObserverStub;
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  }
}
