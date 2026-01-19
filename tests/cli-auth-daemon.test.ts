import { describe, it, expect, beforeEach, vi } from "vitest";
import { Command } from "commander";
import { registerAuthCommands } from "../src/cli/commands/auth.cmd.js";
import { registerDaemonCommands } from "../src/cli/commands/daemon.cmd.js";

const mockConfigService = {
  getRemoteServers: vi.fn(() => []),
  findServer: vi.fn(),
  findLocalServer: vi.fn(),
  findRemoteServer: vi.fn(),
};

const mockAuthService = {
  hasValidToken: vi.fn(() => false),
  isTokenExpired: vi.fn(() => false),
  isRefreshable: vi.fn(() => false),
  getToken: vi.fn(),
  getTokenPreview: vi.fn(),
  getValidToken: vi.fn(() => Promise.resolve("refreshed-token")),
  startOAuthFlow: vi.fn(),
  waitForAuth: vi.fn(),
  stopCallbackServer: vi.fn(),
  refreshToken: vi.fn(),
  removeToken: vi.fn(),
  clearAllTokens: vi.fn(),
  getAllStoredTokenServerIds: vi.fn(() => []),
};

const mockTestingService = {
  testRemoteServer: vi.fn(),
};

const mockDaemonService = {
  startDaemon: vi.fn(),
  stopDaemon: vi.fn(),
  refreshDaemon: vi.fn(),
  getStatus: vi.fn(() => ({
    running: false,
    pid: null,
    port: 8850,
    startupEnabled: false,
    logFile: "/tmp/daemon.log",
  })),
  getLogFilePath: vi.fn(() => "/tmp/daemon.log"),
  getLogs: vi.fn(() => ["line 1", "line 2"]),
  clearLogs: vi.fn(),
  enableStartup: vi.fn(() => ({ success: true })),
  disableStartup: vi.fn(() => ({ success: true })),
  writePidFile: vi.fn(),
  removePidFile: vi.fn(),
};

const mockProfileService = {
  getProfile: vi.fn(),
};

const mockGateway = {
  runGatewayForeground: vi.fn(async () => {}),
};

vi.mock("../src/services/config.service.js", () => ({
  getConfigService: (): typeof mockConfigService => mockConfigService,
}));

vi.mock("../src/services/auth.service.js", () => ({
  getAuthService: (): typeof mockAuthService => mockAuthService,
}));

vi.mock("../src/services/testing.service.js", () => ({
  getTestingService: (): typeof mockTestingService => mockTestingService,
}));

vi.mock("../src/services/daemon.service.js", () => ({
  getDaemonService: (): typeof mockDaemonService => mockDaemonService,
}));

vi.mock("../src/services/profile.service.js", () => ({
  getProfileService: (): typeof mockProfileService => mockProfileService,
}));

vi.mock("../src/services/gateway.service.js", () => ({
  runGatewayForeground: mockGateway.runGatewayForeground,
}));

describe("CLI auth/daemon commands", () => {
  const remoteServer = {
    id: "remote1",
    name: "Remote One",
    url: "https://api.example.com",
    type: "http" as const,
    oauth: { enabled: true },
  };
  const localServer = { id: "local1", name: "Local One", command: "node", args: [] };

  const buildAuthProgram = (): Command => {
    const program = new Command();
    program.exitOverride();
    registerAuthCommands(program);
    return program;
  };

  const buildDaemonProgram = (): Command => {
    const program = new Command();
    program.exitOverride();
    registerDaemonCommands(program);
    return program;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService.getRemoteServers.mockReturnValue([remoteServer]);
    mockConfigService.findServer.mockImplementation((id: string) => {
      if (id === remoteServer.id || id === remoteServer.name) {
        return { server: remoteServer, type: "remote" as const };
      }
      if (id === localServer.id || id === localServer.name) {
        return { server: localServer, type: "local" as const };
      }
      return null;
    });
    mockConfigService.findRemoteServer.mockReturnValue(remoteServer);
    mockConfigService.findLocalServer.mockReturnValue(localServer);

    mockAuthService.getToken.mockReturnValue({ accessToken: "tok", refreshToken: "refresh" });
    mockAuthService.startOAuthFlow.mockResolvedValue({ authUrl: "https://auth", state: "state1" });
    mockAuthService.waitForAuth.mockResolvedValue({ success: true });
    mockAuthService.refreshToken.mockResolvedValue({ accessToken: "new", tokenType: "Bearer" });
    mockTestingService.testRemoteServer.mockResolvedValue({ success: true, toolCount: 2 });
    mockDaemonService.startDaemon.mockResolvedValue({ success: true, pid: 999 });
    mockDaemonService.refreshDaemon.mockResolvedValue({ success: true });
    mockDaemonService.stopDaemon.mockResolvedValue({ success: true });
  });

  it("runs auth login without opening a browser", async () => {
    const program = buildAuthProgram();

    await program.parseAsync(["node", "test", "auth", "login", remoteServer.id, "--no-browser"]);

    expect(mockAuthService.startOAuthFlow).toHaveBeenCalledWith(remoteServer);
    expect(mockAuthService.waitForAuth).toHaveBeenCalledWith("state1");
    expect(mockTestingService.testRemoteServer).toHaveBeenCalled();
  });

  it("logs out, refreshes, and handles login-all", async () => {
    const program = buildAuthProgram();

    mockAuthService.hasValidToken.mockReturnValue(true);
    await program.parseAsync(["node", "test", "auth", "logout", remoteServer.id, "--force"]);
    expect(mockAuthService.removeToken).toHaveBeenCalledWith(remoteServer.id);

    mockAuthService.getToken.mockReturnValue({ accessToken: "tok", refreshToken: "refresh" });
    await program.parseAsync(["node", "test", "auth", "refresh", remoteServer.id]);
    expect(mockAuthService.refreshToken).toHaveBeenCalled();

    mockAuthService.hasValidToken.mockReturnValue(false);
    mockAuthService.startOAuthFlow.mockResolvedValue({ authUrl: "https://auth", state: "state2" });
    await program.parseAsync(["node", "test", "auth", "login-all", "--no-browser"]);
    expect(mockAuthService.startOAuthFlow).toHaveBeenCalledWith(remoteServer);
    expect(mockAuthService.waitForAuth).toHaveBeenCalledWith("state2");
  });

  it("starts daemon with servers, profile, and foreground modes", async () => {
    const program = buildDaemonProgram();

    await program.parseAsync(["node", "test", "daemon", "start", localServer.id, remoteServer.id]);
    expect(mockDaemonService.startDaemon).toHaveBeenCalled();

    mockDaemonService.startDaemon.mockClear();
    mockProfileService.getProfile.mockReturnValue({
      servers: [localServer.id],
      remoteServers: [],
    });
    await program.parseAsync(["node", "test", "daemon", "start", "--profile", "dev"]);
    expect(mockDaemonService.startDaemon).toHaveBeenCalled();

    await program.parseAsync(["node", "test", "daemon", "start", "--foreground"]);
    expect(mockGateway.runGatewayForeground).toHaveBeenCalled();
  });

  it("refreshes daemon and clears logs", async () => {
    const program = buildDaemonProgram();

    await program.parseAsync(["node", "test", "daemon", "refresh"]);
    expect(mockDaemonService.refreshDaemon).toHaveBeenCalled();

    await program.parseAsync(["node", "test", "daemon", "logs", "--clear"]);
    expect(mockDaemonService.clearLogs).toHaveBeenCalled();
  });
});
