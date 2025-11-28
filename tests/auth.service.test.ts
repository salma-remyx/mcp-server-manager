import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { AuthService, resetAuthService } from "../src/services/auth.service.js";
import type { RemoteServer, StoredOAuthTokens } from "../src/types/index.js";

describe("AuthService", () => {
  let configDir: string;
  let service: AuthService;

  beforeEach(() => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpsm-auth-"));
    service = new AuthService(configDir);
  });

  afterEach(() => {
    resetAuthService();
    vi.unstubAllGlobals();
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });

  it("parses WWW-Authenticate headers for auth requirements", () => {
    const header =
      'Bearer realm="example", resource_metadata="https://auth/meta", scope="tools.read", error="invalid_token", error_description="login required"';

    const parsed = service.parseWWWAuthenticate(header);

    expect(parsed.realm).toBe("example");
    expect(parsed.resourceMetadataUrl).toContain("https://auth/meta");
    expect(parsed.scope).toBe("tools.read");
    expect(parsed.error).toBe("invalid_token");
    expect(parsed.errorDescription).toContain("login");
  });

  it("persists tokens and reports validity/preview", () => {
    const expiresAt = Date.now() + 60_000;
    service.saveTokensForServer("srv", {
      accessToken: "token-value",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresAt,
    });

    const reloaded = new AuthService(configDir);
    expect(reloaded.hasValidToken("srv")).toBe(true);
    expect(reloaded.getTokenPreview("srv")).toBe("toke...alue");
    expect(reloaded.getToken("srv")?.refreshToken).toBe("refresh-token");
    expect(reloaded.isTokenExpired("srv")).toBe(false);
  });

  it("refreshes tokens using the refresh_token grant", async () => {
    const server: RemoteServer = {
      id: "remote1",
      name: "Remote",
      url: "https://api.example.com",
      type: "http",
      oauth: { enabled: true },
    };

    const stored: StoredOAuthTokens = {
      accessToken: "old-token",
      refreshToken: "old-refresh",
      tokenType: "Bearer",
    };

    // Stub discovery + fetch to avoid network calls
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          refresh_token: "new-refresh",
          token_type: "Bearer",
          expires_in: 10,
          scope: "one two",
        }),
      })
    );
    // @ts-expect-error - override for testing
    service.discoverAuthServer = vi.fn().mockResolvedValue({
      metadata: { token_endpoint: "https://auth/token" },
    });

    const refreshed = await service.refreshToken(server, stored);

    expect(refreshed?.accessToken).toBe("new-token");
    expect(refreshed?.refreshToken).toBe("new-refresh");
    expect(service.getToken(server.id)?.accessToken).toBe("new-token");
    expect(vi.mocked(fetch)).toHaveBeenCalled();
  });
});
