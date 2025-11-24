/**
 * TUI Screens Unit Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "ink-testing-library";
import fs from "fs";
import path from "path";
import os from "os";

// Mock services before importing screens
vi.mock("../src/services/config.service.js", () => {
  const mockConfigService = {
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
  return {
    getConfigService: vi.fn(() => mockConfigService),
    ConfigService: vi.fn(() => mockConfigService),
    resetConfigService: vi.fn(),
  };
});

vi.mock("../src/services/testing.service.js", () => {
  const mockTestingService = {
    testLocalServer: vi.fn(() => Promise.resolve({ success: true, toolCount: 5 })),
    testRemoteServer: vi.fn(() => Promise.resolve({ success: true, toolCount: 3 })),
    testAllServers: vi.fn(() => Promise.resolve([])),
    autoTestUnknownServers: vi.fn(() => Promise.resolve()),
  };
  return {
    getTestingService: vi.fn(() => mockTestingService),
    TestingService: vi.fn(() => mockTestingService),
    resetTestingService: vi.fn(),
  };
});

vi.mock("../src/services/client.service.js", () => {
  const mockClientService = {
    detectClients: vi.fn(() => [
      {
        id: "claude",
        name: "Claude Desktop",
        installed: true,
        hasConfig: true,
        enabled: true,
        synced: false,
        serverCount: 2,
      },
      {
        id: "cursor",
        name: "Cursor",
        installed: true,
        hasConfig: false,
        enabled: false,
        synced: false,
        serverCount: 0,
      },
    ]),
    enableClient: vi.fn(),
    disableClient: vi.fn(),
    syncToAllClients: vi.fn(() => [{ clientName: "Claude Desktop", success: true, addedCount: 2 }]),
    getClientName: vi.fn((id: string) => id),
  };
  return {
    getClientService: vi.fn(() => mockClientService),
    ClientService: vi.fn(() => mockClientService),
    resetClientService: vi.fn(),
  };
});

vi.mock("../src/services/profile.service.js", () => {
  const mockProfileService = {
    list: vi.fn(() => [
      { id: "default", name: "Default", isActive: true, includesAll: true, serverCount: 0 },
      { id: "dev", name: "Development", isActive: false, includesAll: false, serverCount: 2 },
    ]),
    create: vi.fn(() => ({ success: true })),
    delete: vi.fn(() => ({ success: true })),
    use: vi.fn(() => ({ success: true })),
    getActiveProfileId: vi.fn(() => "default"),
  };
  return {
    getProfileService: vi.fn(() => mockProfileService),
    ProfileService: vi.fn(() => mockProfileService),
    resetProfileService: vi.fn(),
  };
});

vi.mock("../src/services/settings.service.js", () => {
  const mockSettings = {
    autoTest: true,
    theme: "dark",
    logLevel: "info",
  };
  const mockSettingsService = {
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
  return {
    getSettingsService: vi.fn(() => mockSettingsService),
    SettingsService: vi.fn(() => mockSettingsService),
    resetSettingsService: vi.fn(),
  };
});

vi.mock("../src/services/daemon.service.js", () => {
  const mockDaemonService = {
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
  return {
    getDaemonService: vi.fn(() => mockDaemonService),
    DaemonService: vi.fn(() => mockDaemonService),
    resetDaemonService: vi.fn(),
  };
});

vi.mock("../src/services/import-export.service.js", () => {
  const mockImportExportService = {
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
    exportToFile: vi.fn(() => ({ success: true })),
    export: vi.fn(() => ({ servers: [], remoteServers: [] })),
  };
  return {
    getImportExportService: vi.fn(() => mockImportExportService),
    ImportExportService: vi.fn(() => mockImportExportService),
    resetImportExportService: vi.fn(),
  };
});

vi.mock("../src/shared/formatters.js", () => ({
  formatTokens: vi.fn((n: number) => n.toLocaleString()),
  outputJson: vi.fn(),
}));

// Import screens after mocks are set up
import { AddServerScreen } from "../src/tui/screens/AddServerScreen.js";
import { ToolsScreen } from "../src/tui/screens/ToolsScreen.js";
import { ClientsScreen } from "../src/tui/screens/ClientsScreen.js";
import { ProfilesScreen } from "../src/tui/screens/ProfilesScreen.js";
import { SettingsScreen } from "../src/tui/screens/SettingsScreen.js";
import { DaemonScreen } from "../src/tui/screens/DaemonScreen.js";
import { ImportExportScreen } from "../src/tui/screens/ImportExportScreen.js";
import { DoctorScreen } from "../src/tui/screens/DoctorScreen.js";
import { TokensScreen } from "../src/tui/screens/TokensScreen.js";

describe("TUI Screens", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AddServerScreen", () => {
    it("should render the add server screen with title", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Add New MCP Server");
      expect(lastFrame()).toContain("Server name");
    });

    it("should display help text about ESC", () => {
      const { lastFrame } = render(<AddServerScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("ESC to go back");
    });

    it("should call onBack when ESC is pressed on first step", () => {
      const { stdin } = render(<AddServerScreen onBack={mockOnBack} />);

      stdin.write("\x1B"); // Escape

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("ToolsScreen", () => {
    it("should render tools screen with title", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Tool Filters");
    });

    it("should show 'no servers' message when no servers configured", () => {
      const { lastFrame } = render(<ToolsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("No servers configured");
    });

    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should call onBack when ESC is pressed", () => {
      const { stdin } = render(<ToolsScreen onBack={mockOnBack} />);

      stdin.write("\x1B");

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("ClientsScreen", () => {
    it("should render clients screen with title", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("MCP Clients");
    });

    it("should display detected clients", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Claude Desktop");
      expect(lastFrame()).toContain("Cursor");
    });

    it("should show sync status for clients", () => {
      const { lastFrame } = render(<ClientsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("sync ON");
      expect(lastFrame()).toContain("sync OFF");
    });

    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ClientsScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("ProfilesScreen", () => {
    it("should render profiles screen with title", () => {
      const { lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Profiles");
    });

    it("should display existing profiles", () => {
      const { lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Default");
      expect(lastFrame()).toContain("Development");
    });

    it("should show active profile indicator", () => {
      const { lastFrame } = render(<ProfilesScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("(active)");
    });

    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should show create profile view when N is pressed", async () => {
      const { lastFrame, stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

      stdin.write("n");

      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(lastFrame()).toContain("Create New Profile");
      expect(lastFrame()).toContain("Profile name");
    });
  });

  describe("SettingsScreen", () => {
    it("should render settings screen with title", () => {
      const { lastFrame } = render(<SettingsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Settings");
    });

    it("should display settings keys and values", () => {
      const { lastFrame } = render(<SettingsScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("autoTest");
      expect(lastFrame()).toContain("theme");
      expect(lastFrame()).toContain("logLevel");
    });

    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<SettingsScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });

    it("should show reset confirmation when R is pressed", async () => {
      const { lastFrame, stdin } = render(<SettingsScreen onBack={mockOnBack} />);

      stdin.write("r");

      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(lastFrame()).toContain("Reset Settings");
      expect(lastFrame()).toContain("Reset all settings to defaults");
    });
  });

  describe("DaemonScreen", () => {
    it("should render daemon screen with title", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Daemon Management");
    });

    it("should display daemon status", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Status");
      expect(lastFrame()).toContain("Port");
      expect(lastFrame()).toContain("8850");
    });

    it("should display menu options", () => {
      const { lastFrame } = render(<DaemonScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("View Status");
      expect(lastFrame()).toContain("Start Daemon");
      expect(lastFrame()).toContain("Stop Daemon");
      expect(lastFrame()).toContain("View Logs");
    });

    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<DaemonScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("ImportExportScreen", () => {
    it("should render import/export screen with title", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Import / Export");
    });

    it("should display menu options", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Import from File");
      expect(lastFrame()).toContain("Export to File");
      expect(lastFrame()).toContain("Show Export");
    });

    it("should display client import options for installed clients", () => {
      const { lastFrame } = render(<ImportExportScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Import from Claude Desktop");
    });

    it("should call onBack when Q is pressed", () => {
      const { stdin } = render(<ImportExportScreen onBack={mockOnBack} />);

      stdin.write("q");

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("DoctorScreen", () => {
    it("should render doctor screen with title", () => {
      const { lastFrame } = render(<DoctorScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("System Health Check");
    });

    it("should display health check results", async () => {
      const { lastFrame } = render(<DoctorScreen onBack={mockOnBack} />);

      // Wait for async health checks
      await new Promise((resolve) => setTimeout(resolve, 100));

      const frame = lastFrame();
      expect(frame).toContain("Node.js");
    });

    it("should call onBack when any key is pressed after loading", async () => {
      const { stdin } = render(<DoctorScreen onBack={mockOnBack} />);

      // Wait for async health checks
      await new Promise((resolve) => setTimeout(resolve, 100));

      stdin.write(" ");

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe("TokensScreen", () => {
    it("should render tokens screen with title", () => {
      const { lastFrame } = render(<TokensScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("Token Usage");
    });

    it("should show 'no data' message when no token data available", () => {
      const { lastFrame } = render(<TokensScreen onBack={mockOnBack} />);

      expect(lastFrame()).toContain("No token data available");
    });

    it("should call onBack when any key is pressed", () => {
      const { stdin } = render(<TokensScreen onBack={mockOnBack} />);

      stdin.write(" ");

      expect(mockOnBack).toHaveBeenCalled();
    });
  });
});

describe("TUI Screen Navigation", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should support keyboard navigation with arrow keys", () => {
    const { lastFrame, stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

    // Initially first item should be selected
    const initialFrame = lastFrame();
    expect(initialFrame).toContain("→");

    // Press down arrow
    stdin.write("\x1B[B");

    // Selection should move
    const afterDown = lastFrame();
    expect(afterDown).toContain("→");
  });

  it("should support ESC to go back in nested views", async () => {
    const { stdin } = render(<ProfilesScreen onBack={mockOnBack} />);

    // Open create view
    stdin.write("n");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // ESC should go back to list (not call onBack)
    stdin.write("\x1B");
    await new Promise((resolve) => setTimeout(resolve, 50));

    // ESC again should call onBack
    stdin.write("\x1B");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});

describe("TUI Screen State Management", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should maintain state between renders", () => {
    const { lastFrame, stdin, rerender } = render(<ClientsScreen onBack={mockOnBack} />);

    const initialFrame = lastFrame();
    expect(initialFrame).toContain("Claude Desktop");

    // Navigate down
    stdin.write("\x1B[B");

    // State should be maintained
    const afterNav = lastFrame();
    expect(afterNav).toContain("Claude Desktop");
    expect(afterNav).toContain("Cursor");
  });
});

// Import components for testing
import { Header } from "../src/tui/components/Header.js";
import { HelpBar } from "../src/tui/components/HelpBar.js";
import { MenuPanel } from "../src/tui/components/MenuPanel.js";
import { ServerList } from "../src/tui/components/ServerList.js";
import { App } from "../src/tui/App.js";

describe("Header Component", () => {
  it("should render with default title", () => {
    const { lastFrame } = render(<Header />);

    expect(lastFrame()).toContain("MCP Server Manager");
  });

  it("should render with custom title", () => {
    const { lastFrame } = render(<Header title="Custom Title" />);

    expect(lastFrame()).toContain("Custom Title");
  });

  it("should display version when provided", () => {
    const { lastFrame } = render(<Header version="1.2.3" />);

    expect(lastFrame()).toContain("v1.2.3");
  });

  it("should not display version when not provided", () => {
    const { lastFrame } = render(<Header />);

    // Without version prop, should not show "v1.2.3" pattern
    expect(lastFrame()).not.toMatch(/v\d+\.\d+/);
  });

  it("should render with both title and version", () => {
    const { lastFrame } = render(<Header title="My App" version="2.0.0" />);

    expect(lastFrame()).toContain("My App");
    expect(lastFrame()).toContain("v2.0.0");
  });
});

describe("HelpBar Component", () => {
  it("should render default shortcuts", () => {
    const { lastFrame } = render(<HelpBar />);

    expect(lastFrame()).toContain("Navigation:");
    expect(lastFrame()).toContain("Server:");
    expect(lastFrame()).toContain("Global:");
  });

  it("should display navigation shortcuts", () => {
    const { lastFrame } = render(<HelpBar />);

    expect(lastFrame()).toContain("↑/↓ Move");
    expect(lastFrame()).toContain("Space Select");
    expect(lastFrame()).toContain("Q Quit");
  });

  it("should display server shortcuts", () => {
    const { lastFrame } = render(<HelpBar />);

    expect(lastFrame()).toContain("A Add");
    expect(lastFrame()).toContain("D Delete");
    expect(lastFrame()).toContain("X Test");
  });

  it("should display global shortcuts", () => {
    const { lastFrame } = render(<HelpBar />);

    expect(lastFrame()).toContain("C Clients");
    expect(lastFrame()).toContain("F Profiles");
    expect(lastFrame()).toContain("G Settings");
  });

  it("should accept custom shortcut groups", () => {
    const customGroups = [
      { label: "Custom", shortcuts: ["A Action", "B Button"] },
    ];
    const { lastFrame } = render(<HelpBar groups={customGroups} />);

    expect(lastFrame()).toContain("Custom:");
    expect(lastFrame()).toContain("A Action");
    expect(lastFrame()).toContain("B Button");
  });
});

describe("MenuPanel Component", () => {
  it("should render with title", () => {
    const { lastFrame } = render(<MenuPanel />);

    expect(lastFrame()).toContain("Shortcuts");
  });

  it("should display navigation section", () => {
    const { lastFrame } = render(<MenuPanel />);

    expect(lastFrame()).toContain("Navigation");
    expect(lastFrame()).toContain("Move");
    expect(lastFrame()).toContain("Quit");
  });

  it("should display server section", () => {
    const { lastFrame } = render(<MenuPanel />);

    expect(lastFrame()).toContain("Server");
    expect(lastFrame()).toContain("Add");
    expect(lastFrame()).toContain("Delete");
  });

  it("should display views section", () => {
    const { lastFrame } = render(<MenuPanel />);

    expect(lastFrame()).toContain("Views");
    expect(lastFrame()).toContain("Tools");
    expect(lastFrame()).toContain("Clients");
    expect(lastFrame()).toContain("Profiles");
  });

  it("should display system section", () => {
    const { lastFrame } = render(<MenuPanel />);

    expect(lastFrame()).toContain("System");
    expect(lastFrame()).toContain("Daemon");
    expect(lastFrame()).toContain("Doctor");
  });

  it("should accept custom sections", () => {
    const customSections = [
      {
        title: "Custom",
        items: [
          { key: "X", label: "Action" },
          { key: "Y", label: "Button" },
        ],
      },
    ];
    const { lastFrame } = render(<MenuPanel sections={customSections} />);

    expect(lastFrame()).toContain("Custom");
    expect(lastFrame()).toContain("X");
    expect(lastFrame()).toContain("Action");
    expect(lastFrame()).toContain("Y");
    expect(lastFrame()).toContain("Button");
  });
});

describe("ServerList Component", () => {
  const mockLocalServers = [
    { id: "server1", name: "Server One", command: "node", args: [], disabled: false },
    { id: "server2", name: "Server Two", command: "python", args: [], disabled: true },
  ];

  const mockRemoteServers = [
    { id: "remote1", name: "Remote One", url: "http://example.com", type: "sse" as const, disabled: false },
  ];

  it("should render server list with title", () => {
    const { lastFrame } = render(
      <ServerList
        title="Local Servers"
        servers={mockLocalServers}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set()}
      />
    );

    expect(lastFrame()).toContain("Local Servers");
  });

  it("should display server names", () => {
    const { lastFrame } = render(
      <ServerList
        title="Local Servers"
        servers={mockLocalServers}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set()}
      />
    );

    expect(lastFrame()).toContain("Server One");
    expect(lastFrame()).toContain("Server Two");
  });

  it("should show current selection indicator", () => {
    const { lastFrame } = render(
      <ServerList
        title="Local Servers"
        servers={mockLocalServers}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set()}
      />
    );

    expect(lastFrame()).toContain("→");
  });

  it("should show checkbox for selected servers", () => {
    const { lastFrame } = render(
      <ServerList
        title="Local Servers"
        servers={mockLocalServers}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set(["server1"])}
      />
    );

    expect(lastFrame()).toContain("[✓]");
    expect(lastFrame()).toContain("[ ]");
  });

  it("should show disabled status for disabled servers", () => {
    const { lastFrame } = render(
      <ServerList
        title="Local Servers"
        servers={mockLocalServers}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set()}
      />
    );

    expect(lastFrame()).toContain("disabled");
  });

  it("should show tool counts when provided", () => {
    const toolCounts = new Map([["server1", 5]]);
    const { lastFrame } = render(
      <ServerList
        title="Local Servers"
        servers={mockLocalServers}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set()}
        toolCounts={toolCounts}
      />
    );

    expect(lastFrame()).toContain("5 tools");
  });

  it("should return null for empty server list", () => {
    const { lastFrame } = render(
      <ServerList
        title="Empty"
        servers={[]}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set()}
      />
    );

    expect(lastFrame()).toBe("");
  });

  it("should handle remote servers with prefix", () => {
    const { lastFrame } = render(
      <ServerList
        title="Remote Servers"
        servers={mockRemoteServers}
        selectedIndex={0}
        isActiveSection={true}
        selectedServers={new Set(["remote:remote1"])}
        isRemote={true}
      />
    );

    expect(lastFrame()).toContain("Remote One");
    expect(lastFrame()).toContain("[✓]");
  });
});

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the main screen with header", () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain("MCP Server Manager");
  });

  it("should display status bar with profile and port", () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain("Profile:");
    expect(lastFrame()).toContain("Port:");
  });

  it("should show menu panel with shortcuts", () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain("Shortcuts");
    expect(lastFrame()).toContain("Navigation");
    expect(lastFrame()).toContain("Quit");
  });

  it("should show empty state when no servers configured", () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain("No servers configured");
    expect(lastFrame()).toContain("Press A to add");
  });

  it("should navigate to add server screen on A key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("a");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Add New MCP Server");
  });

  it("should navigate to tools screen on T key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("t");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Tool Filters");
  });

  it("should navigate to clients screen on C key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("c");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("MCP Clients");
  });

  it("should navigate to profiles screen on F key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("f");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Profiles");
  });

  it("should navigate to settings screen on G key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("g");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Settings");
  });

  it("should navigate to import/export screen on I key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("i");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Import / Export");
  });

  it("should navigate to doctor screen on H key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("h");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("System Health Check");
  });

  it("should navigate to tokens screen on K key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("k");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Token Usage");
  });

  it("should navigate to daemon screen on M key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("m");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Daemon Management");
  });

  it("should show port message on P key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("p");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Current port:");
    expect(lastFrame()).toContain("8850");
  });

  it("should start testing on X key", async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write("x");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("Testing all servers");
  });

  it("should return to main screen from sub-screen", async () => {
    const { lastFrame, stdin } = render(<App />);

    // Go to tools screen
    stdin.write("t");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lastFrame()).toContain("Tool Filters");

    // Press Q to go back
    stdin.write("q");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(lastFrame()).toContain("MCP Server Manager");
    expect(lastFrame()).toContain("Shortcuts");
  });
});
