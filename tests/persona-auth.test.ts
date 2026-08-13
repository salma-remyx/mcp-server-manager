import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { AuthService, resetAuthService } from "../src/services/auth.service.js";
import { classifyPersonaAuth } from "../src/services/persona-auth.js";
import type { RemoteServer, StoredOAuthTokens } from "../src/types/index.js";

function remoteServer(overrides: Partial<RemoteServer> = {}): RemoteServer {
  return {
    id: "remote",
    name: "Remote",
    type: "http",
    url: "https://api.test/mcp",
    ...overrides,
  };
}

function token(overrides: Partial<StoredOAuthTokens> = {}): StoredOAuthTokens {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    tokenType: "Bearer",
    ...overrides,
  };
}

describe("persona-auth classifier", () => {
  it("classifies a stored OAuth token as an interactive user on the PKCE grant", () => {
    const klass = classifyPersonaAuth(remoteServer(), token());
    expect(klass).toMatchObject({
      persona: "interactive-user",
      credentialType: "dynamic-oauth-pkce",
      provisioningModel: "generate-your-own",
      identityFlow: "user-to-oauth2",
    });
  });

  it("classifies a static bearer/API key as an automated non-user", () => {
    const server = remoteServer({ bearerToken: "sk-static" });
    const klass = classifyPersonaAuth(server, null);
    expect(klass).toMatchObject({
      persona: "automated-non-user",
      credentialType: "static-api-key",
      provisioningModel: "bring-your-own",
      identityFlow: "non-user-to-service-account",
    });
  });

  it("classifies a client-credentials config as a machine client", () => {
    const server = remoteServer({
      oauth: { enabled: true, clientId: "machine", clientSecret: "secret" },
    });
    const klass = classifyPersonaAuth(server, null);
    expect(klass).toMatchObject({
      persona: "automated-non-user",
      credentialType: "client-credentials",
    });
  });

  it("reports no credential when nothing is configured", () => {
    const klass = classifyPersonaAuth(remoteServer(), null);
    expect(klass.credentialType).toBe("none");
    expect(klass.provisioningModel).toBeUndefined();
    expect(klass.identityFlow).toBeUndefined();
  });
});

describe("AuthService persona integration", () => {
  let configDir: string;
  let service: AuthService;
  let originalMcpManagerConfigDir: string | undefined;
  let originalMcpsmConfigDir: string | undefined;

  beforeEach(() => {
    originalMcpManagerConfigDir = process.env.MCP_MANAGER_CONFIG_DIR;
    originalMcpsmConfigDir = process.env.MCPSM_CONFIG_DIR;
    delete process.env.MCP_MANAGER_CONFIG_DIR;
    delete process.env.MCPSM_CONFIG_DIR;
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpsm-persona-"));
    service = new AuthService(configDir);
  });

  afterEach(() => {
    resetAuthService();
    if (fs.existsSync(configDir)) {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
    if (originalMcpManagerConfigDir === undefined) {
      delete process.env.MCP_MANAGER_CONFIG_DIR;
    } else {
      process.env.MCP_MANAGER_CONFIG_DIR = originalMcpManagerConfigDir;
    }
    if (originalMcpsmConfigDir === undefined) {
      delete process.env.MCPSM_CONFIG_DIR;
    } else {
      process.env.MCPSM_CONFIG_DIR = originalMcpsmConfigDir;
    }
  });

  // Exercises the wiring edit in auth.service.ts: saving an OAuth token
  // stamps the persona × credential classification, surfaced via getAuthPersona.
  it("stamps the interactive-user classification when OAuth tokens are saved", () => {
    service.saveTokensForServer("srv", token());

    const klass = service.getAuthPersona("srv");
    expect(klass).toMatchObject({
      persona: "interactive-user",
      credentialType: "dynamic-oauth-pkce",
      identityFlow: "user-to-oauth2",
    });
  });

  it("persists the stamped classification across reloads", () => {
    service.saveTokensForServer("srv", token());

    const reloaded = new AuthService(configDir);
    const klass = reloaded.getAuthPersona("srv");
    expect(klass?.persona).toBe("interactive-user");
    expect(klass?.credentialType).toBe("dynamic-oauth-pkce");
  });

  it("computes the static-key persona live from the server config", () => {
    const server = remoteServer({ id: "key-srv", bearerToken: "sk-static" });
    const klass = service.getAuthPersona("key-srv", server);
    expect(klass).toMatchObject({
      persona: "automated-non-user",
      credentialType: "static-api-key",
      provisioningModel: "bring-your-own",
    });
  });

  it("returns null when no token and no server are available", () => {
    expect(service.getAuthPersona("unknown")).toBeNull();
  });
});
