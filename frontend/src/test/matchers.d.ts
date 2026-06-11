declare module "vitest" {
  interface Assertion<T = unknown> {
    toBeInTheDocument(): T;
    toHaveAttribute(name: string, value?: string): T;
    toHaveTextContent(text: string | RegExp): T;
    toHaveValue(value: string | number): T;
  }

  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): void;
    toHaveAttribute(name: string, value?: string): void;
    toHaveTextContent(text: string | RegExp): void;
    toHaveValue(value: string | number): void;
  }
}

export {};
