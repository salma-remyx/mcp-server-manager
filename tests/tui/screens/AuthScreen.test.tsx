import React from "react";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import {
  setupMocks,
  mockConfigService,
  mockAuthService,
  mockTestingService,
  waitForStateUpdate,
  sampleRemoteServers,
  KEYS,
} from "../../tui/setup.js";

setupMocks();

import { AuthScreen } from "../../../src/tui/screens/AuthScreen.js";

describe("AuthScreen", () => {
  beforeEach(() => {
    setupMocks();
    vi.clearAllMocks();
    mockConfigService.getRemoteServers.mockReturnValue(
      sampleRemoteServers.map((s) => ({ ...s, oauth: { enabled: true } }))
    );
    mockAuthService.getAllStoredTokenServerIds.mockReturnValue([]);
    mockAuthService.isRefreshable.mockReturnValue(false);
  });

  it("runs login-all when A is pressed", async () => {
    mockAuthService.startOAuthFlow.mockResolvedValue({ authUrl: "https://auth", state: "state" });
    mockAuthService.waitForAuth.mockResolvedValue({ success: true });
    mockAuthService.hasValidToken.mockReturnValue(false);
    mockAuthService.getToken.mockReturnValue(null);
    mockTestingService.testRemoteServer?.mockReturnValue(
      Promise.resolve({ success: false, requiresAuth: true })
    );

    const { stdin } = render(<AuthScreen onBack={() => {}} />);
    await waitForStateUpdate();
    stdin.write("a");
    await waitForStateUpdate(300);

    expect(mockAuthService.startOAuthFlow).toHaveBeenCalled();
  });

  it("revokes a token when confirmed after pressing R", async () => {
    mockAuthService.hasValidToken.mockReturnValue(true);
    mockAuthService.getToken.mockReturnValue({
      accessToken: "token",
      refreshToken: "refresh",
      tokenType: "Bearer",
    });
    mockAuthService.getAllStoredTokenServerIds.mockReturnValue([sampleRemoteServers[0].id]);

    const { stdin, lastFrame } = render(<AuthScreen onBack={() => {}} />);
    await waitForStateUpdate();

    await waitForStateUpdate(200);
    stdin.write("r");
    await waitForStateUpdate(200);
    expect(lastFrame()).toContain("Revoke Token");

    stdin.write("Y");
    await waitForStateUpdate(500);

    expect(mockAuthService.removeToken).toHaveBeenCalledWith(sampleRemoteServers[0].id);
  });

  it("goes back on ESC", async () => {
    const onBack = vi.fn();
    const { stdin } = render(<AuthScreen onBack={onBack} />);
    await waitForStateUpdate();
    stdin.write(KEYS.ESCAPE);
    expect(onBack).toHaveBeenCalled();
  });
});
