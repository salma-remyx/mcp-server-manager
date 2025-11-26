/**
 * Shared TUI test setup and mocks
 */

import { vi } from "vitest";

// Mock config service
export const mockConfigService = {
  getLocalServers: vi.fn(() => []),
  getRemoteServers: vi.fn(() => []),
  getToolFilters: vi.fn(() => ({})),
  getSelectionState: vi.fn(() => ({ local: [], remote: [] })),
  saveSelectionState: vi.fn(),
  generateServerId: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
  addLocalServer: vi.fn(() => ({ success: true })),
  addRemoteServer: vi.fn(() => ({ success: true })),
  removeLocalServer: vi.fn(() => ({ success: true })),
  removeRemoteServer: vi.fn(() => ({ success: true })),
  enableServer: vi.fn(() => ({ success: true })),
  disableServer: vi.fn(() => ({ success: true })),
  toggleTool: vi.fn(),
  enableAllTools: vi.fn(),
  disableAllTools: vi.fn(),
  resetToolFilters: vi.fn(() => ({ success: true })),
  getPort: vi.fn(() => 8850),
  getPaths: vi.fn(() => ({
    configDir: "/tmp/test",
    configPath: "/tmp/test/config.json",
  })),
};

// Mock testing service
export const mockTestingService = {
  testLocalServer: vi.fn(() => Promise.resolve({ success: true, toolCount: 5 })),
  testRemoteServer: vi.fn(() => Promise.resolve({ success: true, toolCount: 3 })),
  testAllServers: vi.fn(() => Promise.resolve([])),
  testAllServersStreaming: vi.fn(async (_onResult: (result: unknown) => void) => {
    // Simulate streaming by calling onResult for each result
    return Promise.resolve([]);
  }),
  autoTestUnknownServers: vi.fn(() => Promise.resolve()),
};

// Mock client service
export const mockClientService = {
  detectClients: vi.fn(() => [
    {
      id: "claude",
      name: "Claude Desktop",
      configPath: "/path/to/claude/config.json",
      installed: true,
      hasConfig: true,
      status: "connected" as const,
      serverCount: 2,
    },
    {
      id: "cursor",
      name: "Cursor",
      configPath: null,
      installed: true,
      hasConfig: false,
      status: "disconnected" as const,
      serverCount: 0,
    },
  ]),
  connectClient: vi.fn(() => ({ success: true })),
  disconnectClient: vi.fn(() => ({ success: true })),
  getConnectionStatus: vi.fn((_id: string) => "connected" as const),
  getClientName: vi.fn((_id: string) => "client"),
  getClientConfigPath: vi.fn(() => "/path/to/config"),
  isClientInstalled: vi.fn(() => true),
  getSupportedClients: vi.fn(() => ["claude", "cursor", "windsurf"]),
  clientExists: vi.fn(() => true),
  readClientConfig: vi.fn(() => null),
  writeClientConfig: vi.fn(() => true),
  openClientConfig: vi.fn(() => ({ success: true })),
};

// Mock profile service
export const mockProfileService = {
  list: vi.fn(() => [
    { id: "default", name: "Default", isActive: true, includesAll: true, serverCount: 0 },
    { id: "dev", name: "Development", isActive: false, includesAll: false, serverCount: 2 },
  ]),
  create: vi.fn(() => ({ success: true })),
  delete: vi.fn(() => ({ success: true })),
  use: vi.fn(() => ({ success: true })),
  getActiveProfileId: vi.fn(() => "default"),
};

// Mock settings service
export const mockSettings = {
  autoTest: true,
  theme: "dark",
  logLevel: "info",
};

export const mockSettingsService = {
  getAll: vi.fn(() => mockSettings),
  getKeys: vi.fn(() => Object.keys(mockSettings) as (keyof typeof mockSettings)[]),
  get: vi.fn((key: string) => mockSettings[key as keyof typeof mockSettings]),
  set: vi.fn(() => ({ success: true })),
  reset: vi.fn(),
  isDefault: vi.fn(() => true),
  getInfo: vi.fn(() => ({
    autoTest: { description: "Auto test new servers", type: "boolean" },
    theme: { description: "UI theme", type: "string", options: ["dark", "light"] },
    logLevel: { description: "Log level", type: "string" },
  })),
};

// Mock daemon service
export const mockDaemonService = {
  getStatus: vi.fn(() => ({
    running: false,
    pid: null,
    port: 8850,
    startupEnabled: false,
    logFile: "/tmp/daemon.log",
  })),
  isDaemonRunning: vi.fn(() => ({ running: false, pid: null })),
  startDaemon: vi.fn(() => ({ success: true, pid: 12345 })),
  stopDaemon: vi.fn(() => ({ success: true })),
  enableStartup: vi.fn(() => ({ success: true })),
  disableStartup: vi.fn(() => ({ success: true })),
  getLogFilePath: vi.fn(() => "/tmp/daemon.log"),
};

// Mock import/export service
export const mockImportExportService = {
  importFromFile: vi.fn(() => ({
    success: true,
    servers: [{ id: "imported", name: "Imported Server", command: "node", args: [] }],
    format: "mcpsm",
  })),
  importFromClient: vi.fn(() => ({
    success: true,
    servers: [{ id: "from-client", name: "From Client", command: "node", args: [] }],
  })),
  mergeServers: vi.fn(() => ({ added: 1, updated: 0, skipped: 0 })),
  mergeServersWithDecisions: vi.fn(() => ({ added: 1, updated: 0, skipped: 0, merged: 0 })),
  detectConflicts: vi.fn(() => ({
    conflicts: [],
    noConflicts: [{ id: "from-client", name: "From Client", command: "node", args: [] }],
    totalConflicts: 0,
  })),
  exportToFile: vi.fn(() => ({ success: true })),
  export: vi.fn(() => ({ servers: [], remoteServers: [] })),
};

// Setup all mocks
export function setupMocks(): void {
  vi.mock("../../src/services/config.service.js", () => ({
    getConfigService: vi.fn(() => mockConfigService),
    ConfigService: vi.fn(() => mockConfigService),
    resetConfigService: vi.fn(),
  }));

  vi.mock("../../src/services/testing.service.js", () => ({
    getTestingService: vi.fn(() => mockTestingService),
    TestingService: vi.fn(() => mockTestingService),
    resetTestingService: vi.fn(),
  }));

  vi.mock("../../src/services/client.service.js", () => ({
    getClientService: vi.fn(() => mockClientService),
    ClientService: vi.fn(() => mockClientService),
    resetClientService: vi.fn(),
  }));

  vi.mock("../../src/services/profile.service.js", () => ({
    getProfileService: vi.fn(() => mockProfileService),
    ProfileService: vi.fn(() => mockProfileService),
    resetProfileService: vi.fn(),
  }));

  vi.mock("../../src/services/settings.service.js", () => ({
    getSettingsService: vi.fn(() => mockSettingsService),
    SettingsService: vi.fn(() => mockSettingsService),
    resetSettingsService: vi.fn(),
  }));

  vi.mock("../../src/services/daemon.service.js", () => ({
    getDaemonService: vi.fn(() => mockDaemonService),
    DaemonService: vi.fn(() => mockDaemonService),
    resetDaemonService: vi.fn(),
  }));

  vi.mock("../../src/services/import-export.service.js", () => ({
    getImportExportService: vi.fn(() => mockImportExportService),
    ImportExportService: vi.fn(() => mockImportExportService),
    resetImportExportService: vi.fn(),
  }));

  vi.mock("../../src/shared/formatters.js", () => ({
    formatTokens: vi.fn((n: number) => n.toLocaleString()),
    outputJson: vi.fn(),
  }));
}

// Sample test data
export const sampleLocalServers = [
  { id: "server1", name: "Server One", command: "node", args: ["server.js"], disabled: false },
  { id: "server2", name: "Server Two", command: "python", args: ["-m", "server"], disabled: true },
  { id: "server3", name: "Server Three", command: "npx", args: ["mcp-server"], disabled: false },
];

export const sampleRemoteServers = [
  {
    id: "remote1",
    name: "Remote One",
    url: "http://localhost:3000",
    type: "sse" as const,
    disabled: false,
  },
  {
    id: "remote2",
    name: "Remote Two",
    url: "https://api.example.com/mcp",
    type: "http" as const,
    disabled: false,
  },
];

// Helper to wait for async state updates
export const waitForStateUpdate = (ms = 150): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Helper to simulate key press
export const KEYS = {
  UP: "\x1B[A",
  DOWN: "\x1B[B",
  LEFT: "\x1B[D",
  RIGHT: "\x1B[C",
  ENTER: "\r",
  ESCAPE: "\x1B",
  SPACE: " ",
  TAB: "\t",
  BACKSPACE: "\x7F",
};
