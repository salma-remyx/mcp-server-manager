// tests/vitest.setup.ts
import { vi } from "vitest";

// Mock the 'open' module to prevent actual browser launches during tests
vi.mock("open", () => ({
  default: vi.fn((url: string) => {
    console.log(`Mocked 'open' called with URL: ${url}`);
    return Promise.resolve({ exitCode: 0, command: "mock-browser" });
  }),
}));
