/**
 * OAuth Authentication service for MCP servers
 * Implements OAuth 2.1 with PKCE following the MCP specification
 */

import {
  createServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "http";
import { URL, URLSearchParams } from "url";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type {
  AuthServerMetadata,
  ProtectedResourceMetadata,
  PKCEData,
  PendingAuthorization,
  TokenResponse,
  AuthResult,
  ClientRegistration,
  ClientRegistrationRequest,
  ServerAuthRequirements,
  StoredOAuthTokens,
  RemoteServer,
} from "../types/index.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("AuthService");

/** Default callback port range */
const CALLBACK_PORT_START = 8400;
const CALLBACK_PORT_END = 8450;

/** Token storage file name */
const TOKENS_FILE = "oauth-tokens.json";

/** Pending authorizations storage */
const PENDING_AUTH_FILE = "pending-auth.json";

/** Default timeout for OAuth flow (5 minutes) */
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

/** Token refresh threshold (refresh 5 minutes before expiry) */
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/** MCP Client information for registration */
const MCP_CLIENT_INFO = {
  client_name: "MCP Server Manager",
  software_id: "mcp-server-manager",
  software_version: "1.2.1",
};

/**
 * OAuth Authentication Service
 */
export class AuthService {
  private configDir: string;
  private tokensPath: string;
  private pendingAuthPath: string;
  private tokens: Map<string, StoredOAuthTokens>;
  private pendingAuths: Map<string, PendingAuthorization>;
  private callbackServer: HttpServer | null = null;
  private callbackPort: number | null = null;

  constructor(configDir?: string) {
    this.configDir =
      configDir ||
      process.env.MCPSM_CONFIG_DIR ||
      path.join(process.env.HOME || process.env.USERPROFILE || "", ".mcpsm");

    this.tokensPath = path.join(this.configDir, TOKENS_FILE);
    this.pendingAuthPath = path.join(this.configDir, PENDING_AUTH_FILE);
    this.tokens = new Map();
    this.pendingAuths = new Map();

    this.ensureConfigDir();
    this.loadTokens();
    this.loadPendingAuths();
  }

  /** Ensure config directory exists */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /** Load stored tokens from disk */
  private loadTokens(): void {
    try {
      if (fs.existsSync(this.tokensPath)) {
        const data = fs.readFileSync(this.tokensPath, "utf8");
        const parsed = JSON.parse(data) as Record<string, StoredOAuthTokens>;
        this.tokens = new Map(Object.entries(parsed));
      }
    } catch (error) {
      log.debug("Failed to load OAuth tokens:", error);
      this.tokens = new Map();
    }
  }

  /** Save tokens to disk */
  private saveTokens(): void {
    try {
      const data = Object.fromEntries(this.tokens);
      fs.writeFileSync(this.tokensPath, JSON.stringify(data, null, 2));
    } catch (error) {
      log.debug("Failed to save OAuth tokens:", error);
    }
  }

  /** Load pending authorizations from disk */
  private loadPendingAuths(): void {
    try {
      if (fs.existsSync(this.pendingAuthPath)) {
        const data = fs.readFileSync(this.pendingAuthPath, "utf8");
        const parsed = JSON.parse(data) as Record<string, PendingAuthorization>;

        // Clean up expired pending auths
        const now = Date.now();
        for (const [key, auth] of Object.entries(parsed)) {
          if (now - auth.createdAt < AUTH_TIMEOUT_MS) {
            this.pendingAuths.set(key, auth);
          }
        }
      }
    } catch (error) {
      log.debug("Failed to load pending authorizations:", error);
      this.pendingAuths = new Map();
    }
  }

  /** Save pending authorizations to disk */
  private savePendingAuths(): void {
    try {
      const data = Object.fromEntries(this.pendingAuths);
      fs.writeFileSync(this.pendingAuthPath, JSON.stringify(data, null, 2));
    } catch (error) {
      log.debug("Failed to save pending authorizations:", error);
    }
  }

  // === PKCE Implementation ===

  /** Generate cryptographically secure random string */
  private generateRandomString(length: number): string {
    const bytes = crypto.randomBytes(length);
    return bytes
      .toString("base64url")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, length);
  }

  /** Generate PKCE code verifier and challenge */
  generatePKCE(): PKCEData {
    // Generate a random code verifier (43-128 characters)
    const codeVerifier = this.generateRandomString(64);

    // Generate code challenge using SHA-256
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    const codeChallenge = hash.toString("base64url");

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: "S256",
    };
  }

  /** Generate random state parameter */
  generateState(): string {
    return this.generateRandomString(32);
  }

  // === Server Metadata Discovery ===

  /** Parse WWW-Authenticate header to extract auth requirements */
  parseWWWAuthenticate(header: string): ServerAuthRequirements {
    const result: ServerAuthRequirements = { requiresAuth: true };

    // Parse Bearer scheme parameters
    const bearerMatch = header.match(/Bearer\s+(.+)/i);
    if (!bearerMatch) {
      return result;
    }

    const params = bearerMatch[1];

    // Extract realm
    const realmMatch = params.match(/realm="([^"]+)"/);
    if (realmMatch) {
      result.realm = realmMatch[1];
    }

    // Extract resource_metadata URL (RFC 9728)
    const resourceMetadataMatch = params.match(/resource_metadata="([^"]+)"/);
    if (resourceMetadataMatch) {
      result.resourceMetadataUrl = resourceMetadataMatch[1];
    }

    // Extract scope
    const scopeMatch = params.match(/scope="([^"]+)"/);
    if (scopeMatch) {
      result.scope = scopeMatch[1];
    }

    // Extract error
    const errorMatch = params.match(/error="([^"]+)"/);
    if (errorMatch) {
      result.error = errorMatch[1];
    }

    // Extract error_description
    const errorDescMatch = params.match(/error_description="([^"]+)"/);
    if (errorDescMatch) {
      result.errorDescription = errorDescMatch[1];
    }

    return result;
  }

  /** Fetch protected resource metadata (RFC 9728) */
  async fetchProtectedResourceMetadata(
    serverUrl: string,
    metadataUrl?: string
  ): Promise<ProtectedResourceMetadata | null> {
    try {
      let url: string;

      if (metadataUrl) {
        url = metadataUrl;
      } else {
        // Try well-known URI as per RFC 9728
        const serverUri = new URL(serverUrl);
        const pathPrefix = serverUri.pathname !== "/" ? serverUri.pathname : "";
        url = `${serverUri.origin}/.well-known/oauth-protected-resource${pathPrefix}`;
      }

      log.debug("Fetching protected resource metadata from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        log.debug("Protected resource metadata not found at:", url);
        return null;
      }

      const metadata = (await response.json()) as ProtectedResourceMetadata;
      return metadata;
    } catch (error) {
      log.debug("Error fetching protected resource metadata:", error);
      return null;
    }
  }

  /** Fetch authorization server metadata (RFC 8414) */
  async fetchAuthServerMetadata(authServerUrl: string): Promise<AuthServerMetadata | null> {
    try {
      const serverUri = new URL(authServerUrl);

      // Try OAuth 2.0 Authorization Server Metadata first (RFC 8414)
      const wellKnownUrls = [
        `${serverUri.origin}/.well-known/oauth-authorization-server${serverUri.pathname !== "/" ? serverUri.pathname : ""}`,
        `${serverUri.origin}/.well-known/oauth-authorization-server`,
        `${serverUri.origin}/.well-known/openid-configuration`,
        `${serverUri.origin}${serverUri.pathname !== "/" ? serverUri.pathname : ""}/.well-known/openid-configuration`,
      ];

      for (const url of wellKnownUrls) {
        try {
          log.debug("Trying auth server metadata at:", url);
          const response = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
          });

          if (response.ok) {
            const metadata = (await response.json()) as AuthServerMetadata;
            if (metadata.authorization_endpoint && metadata.token_endpoint) {
              log.debug("Found auth server metadata at:", url);
              return metadata;
            }
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      log.debug("Error fetching auth server metadata:", error);
      return null;
    }
  }

  /** Discover authorization server for a remote server */
  async discoverAuthServer(
    server: RemoteServer,
    authRequirements?: ServerAuthRequirements
  ): Promise<{
    metadata: AuthServerMetadata;
    resourceMetadata?: ProtectedResourceMetadata;
  } | null> {
    try {
      // First, try to get protected resource metadata
      const resourceMetadata = await this.fetchProtectedResourceMetadata(
        server.url,
        authRequirements?.resourceMetadataUrl
      );

      let authServerUrl: string | undefined;

      if (resourceMetadata?.authorization_servers?.length) {
        authServerUrl = resourceMetadata.authorization_servers[0];
      } else if (server.oauth?.authServerUrl) {
        authServerUrl = server.oauth.authServerUrl;
      } else {
        // Fall back to using the server's URL as the auth server
        const serverUri = new URL(server.url);
        authServerUrl = serverUri.origin;
      }

      if (!authServerUrl) {
        log.debug("No authorization server URL found for server:", server.id);
        return null;
      }

      const metadata = await this.fetchAuthServerMetadata(authServerUrl);
      if (!metadata) {
        log.debug("Could not fetch auth server metadata for:", authServerUrl);
        return null;
      }

      return { metadata, resourceMetadata: resourceMetadata || undefined };
    } catch (error) {
      log.debug("Error discovering auth server:", error);
      return null;
    }
  }

  // === Dynamic Client Registration ===

  /** Register client dynamically with authorization server (RFC 7591) */
  async registerClient(
    registrationEndpoint: string,
    redirectUri: string
  ): Promise<ClientRegistration | null> {
    try {
      const request: ClientRegistrationRequest = {
        redirect_uris: [redirectUri],
        client_name: MCP_CLIENT_INFO.client_name,
        token_endpoint_auth_method: "none", // Public client
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        software_id: MCP_CLIENT_INFO.software_id,
        software_version: MCP_CLIENT_INFO.software_version,
      };

      const response = await fetch(registrationEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.debug("Client registration failed:", errorText);
        return null;
      }

      const registration = (await response.json()) as ClientRegistration;
      return registration;
    } catch (error) {
      log.debug("Error registering client:", error);
      return null;
    }
  }

  // === Callback Server ===

  /** Find an available port for the callback server */
  private async findAvailablePort(): Promise<number> {
    for (let port = CALLBACK_PORT_START; port <= CALLBACK_PORT_END; port++) {
      const available = await new Promise<boolean>((resolve) => {
        const server = createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
          server.close();
          resolve(true);
        });
        server.listen(port, "127.0.0.1");
      });

      if (available) {
        return port;
      }
    }

    throw new Error("No available port found for OAuth callback server");
  }

  /** Start the callback server to receive OAuth redirects */
  async startCallbackServer(): Promise<string> {
    if (this.callbackServer) {
      return `http://127.0.0.1:${this.callbackPort}/callback`;
    }

    this.callbackPort = await this.findAvailablePort();

    return new Promise((resolve, reject) => {
      this.callbackServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleCallback(req, res);
      });

      this.callbackServer.once("error", (err) => {
        this.callbackServer = null;
        this.callbackPort = null;
        reject(err);
      });

      const port = this.callbackPort;
      if (!port) {
        reject(new Error("Callback port not set"));
        return;
      }

      this.callbackServer.listen(port, "127.0.0.1", () => {
        log.debug(`OAuth callback server listening on port ${port}`);
        resolve(`http://127.0.0.1:${port}/callback`);
      });
    });
  }

  /** Stop the callback server */
  stopCallbackServer(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = null;
      this.callbackPort = null;
      log.debug("OAuth callback server stopped");
    }
  }

  /** Handle OAuth callback */
  private handleCallback(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || "", `http://127.0.0.1:${this.callbackPort}`);

    if (url.pathname !== "/callback") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      // Handle error response
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(this.renderCallbackPage("error", errorDescription || error));

      // Emit error event for pending auth
      if (state) {
        this.handleAuthError(state, error, errorDescription || undefined);
      }
      return;
    }

    if (!code || !state) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(this.renderCallbackPage("error", "Missing authorization code or state parameter."));
      return;
    }

    // Process the callback in the background
    this.processCallback(state, code)
      .then((result) => {
        if (result.success) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(this.renderCallbackPage("success"));
        } else {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(this.renderCallbackPage("error", result.error || "Unknown error"));
        }
      })
      .catch((err) => {
        log.debug("Callback processing error:", err);
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(this.renderCallbackPage("error", "An unexpected error occurred."));
      });
  }

  /** Render OAuth callback page HTML */
  private renderCallbackPage(type: "success" | "error", message?: string): string {
    const isSuccess = type === "success";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSuccess ? "Authentication Successful" : "Authentication Failed"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
    }
    
    .container {
      text-align: center;
      padding: 3rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 420px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      animation: pop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    .icon.success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
    }
    
    .icon.error {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 0 40px rgba(239, 68, 68, 0.4);
    }
    
    @keyframes pop {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: ${isSuccess ? "#10b981" : "#ef4444"};
    }
    
    p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 1rem;
      line-height: 1.6;
    }
    
    .message {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
    }
    
    .close-hint {
      margin-top: 2rem;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.4);
    }
    
    .brand {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon ${type}">
      ${isSuccess ? "✓" : "✕"}
    </div>
    <h1>${isSuccess ? "Authentication Successful" : "Authentication Failed"}</h1>
    <p>${isSuccess ? "You've been authenticated successfully." : "Something went wrong during authentication."}</p>
    ${message && !isSuccess ? `<div class="message">${message}</div>` : ""}
    <p class="close-hint">${isSuccess ? "This window will close automatically..." : "You can close this window and try again."}</p>
    <div class="brand">MCP Server Manager</div>
  </div>
  ${isSuccess ? "<script>setTimeout(() => window.close(), 3000);</script>" : ""}
</body>
</html>`;
  }

  /** Handle auth error from callback */
  private handleAuthError(state: string, error: string, description?: string): void {
    const pendingAuth = this.pendingAuths.get(state);
    if (pendingAuth) {
      this.pendingAuths.delete(state);
      this.savePendingAuths();
      log.debug(`Auth error for ${pendingAuth.serverId}: ${error} - ${description}`);
    }
  }

  /** Process OAuth callback and exchange code for tokens */
  private async processCallback(state: string, code: string): Promise<AuthResult> {
    const pendingAuth = this.pendingAuths.get(state);
    if (!pendingAuth) {
      return { success: false, error: "Invalid or expired authorization state" };
    }

    try {
      // Exchange authorization code for tokens
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: pendingAuth.redirectUri,
        client_id: pendingAuth.clientId,
        code_verifier: pendingAuth.pkce.codeVerifier,
      });

      if (pendingAuth.clientSecret) {
        tokenParams.set("client_secret", pendingAuth.clientSecret);
      }

      const response = await fetch(pendingAuth.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenParams.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        log.debug("Token exchange failed:", errorData);
        return { success: false, error: `Token exchange failed: ${response.status}` };
      }

      const tokenResponse = (await response.json()) as TokenResponse;

      // Store the tokens
      const storedTokens: StoredOAuthTokens = {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type || "Bearer",
        refreshToken: tokenResponse.refresh_token,
        scopes: tokenResponse.scope?.split(" "),
        expiresAt: tokenResponse.expires_in
          ? Date.now() + tokenResponse.expires_in * 1000
          : undefined,
      };

      this.tokens.set(pendingAuth.serverId, storedTokens);
      this.saveTokens();

      // Clean up pending auth
      this.pendingAuths.delete(state);
      this.savePendingAuths();

      log.debug(`Successfully authenticated server: ${pendingAuth.serverId}`);

      return {
        success: true,
        token: tokenResponse.access_token,
        expiresAt: storedTokens.expiresAt,
        refreshToken: tokenResponse.refresh_token,
      };
    } catch (error) {
      log.debug("Error processing callback:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // === Authorization Flow ===

  /** Build authorization URL for a server */
  async buildAuthorizationUrl(
    server: RemoteServer,
    metadata: AuthServerMetadata,
    redirectUri: string,
    clientId: string,
    clientSecret?: string,
    scopes?: string[]
  ): Promise<{ url: string; state: string; pkce: PKCEData }> {
    const pkce = this.generatePKCE();
    const state = this.generateState();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
    });

    // Add scopes if specified
    if (scopes?.length) {
      params.set("scope", scopes.join(" "));
    } else if (server.oauth?.scopes?.length) {
      params.set("scope", server.oauth.scopes.join(" "));
    } else if (metadata.scopes_supported?.length) {
      params.set("scope", metadata.scopes_supported.join(" "));
    }

    // Add resource parameter (RFC 8707)
    params.set("resource", server.url);

    const url = `${metadata.authorization_endpoint}?${params.toString()}`;

    // Store pending authorization
    const pendingAuth: PendingAuthorization = {
      serverId: server.id,
      serverUrl: server.url,
      pkce,
      state,
      redirectUri,
      authorizationEndpoint: metadata.authorization_endpoint,
      tokenEndpoint: metadata.token_endpoint,
      clientId,
      clientSecret,
      scopes,
      createdAt: Date.now(),
    };

    this.pendingAuths.set(state, pendingAuth);
    this.savePendingAuths();

    return { url, state, pkce };
  }

  /** Start OAuth flow for a server */
  async startOAuthFlow(
    server: RemoteServer,
    authRequirements?: ServerAuthRequirements
  ): Promise<{ authUrl: string; state: string } | null> {
    try {
      // Discover authorization server
      const discovery = await this.discoverAuthServer(server, authRequirements);
      if (!discovery) {
        log.debug("Could not discover authorization server for:", server.id);
        return null;
      }

      const { metadata, resourceMetadata } = discovery;

      // Start callback server
      const redirectUri = await this.startCallbackServer();

      // Determine client ID
      let clientId = server.oauth?.clientId;
      let clientSecret = server.oauth?.clientSecret;

      // If no pre-registered client, try dynamic registration
      if (!clientId && metadata.registration_endpoint) {
        log.debug("Attempting dynamic client registration...");
        const registration = await this.registerClient(metadata.registration_endpoint, redirectUri);
        if (registration) {
          clientId = registration.client_id;
          clientSecret = registration.client_secret;
        }
      }

      // If still no client ID, use the redirect URI as client ID (Client ID Metadata Document)
      if (!clientId) {
        clientId = redirectUri;
      }

      // Determine scopes
      const scopes =
        server.oauth?.scopes ||
        (authRequirements?.scope ? [authRequirements.scope] : undefined) ||
        resourceMetadata?.scopes_supported;

      // Build authorization URL
      const { url, state } = await this.buildAuthorizationUrl(
        server,
        metadata,
        redirectUri,
        clientId,
        clientSecret,
        scopes
      );

      return { authUrl: url, state };
    } catch (error) {
      log.debug("Error starting OAuth flow:", error);
      return null;
    }
  }

  /** Wait for OAuth completion */
  async waitForAuth(state: string, timeoutMs: number = AUTH_TIMEOUT_MS): Promise<AuthResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkAuth = (): void => {
        // Check if auth is still pending
        const pendingAuth = this.pendingAuths.get(state);

        if (!pendingAuth) {
          // Auth completed (either success or failure)
          // Check if we have tokens for this server
          for (const [_serverId, tokens] of this.tokens) {
            // Find the server that matches
            if (tokens.accessToken) {
              resolve({
                success: true,
                token: tokens.accessToken,
                expiresAt: tokens.expiresAt,
                refreshToken: tokens.refreshToken,
              });
              return;
            }
          }
          resolve({ success: false, error: "Authorization was cancelled or failed" });
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          this.pendingAuths.delete(state);
          this.savePendingAuths();
          resolve({ success: false, error: "Authorization timeout" });
          return;
        }

        // Continue waiting
        setTimeout(checkAuth, 500);
      };

      checkAuth();
    });
  }

  // === Token Management ===

  /** Get stored token for a server */
  getToken(serverId: string): StoredOAuthTokens | null {
    return this.tokens.get(serverId) || null;
  }

  /** Get valid access token for a server (refreshes if needed) */
  async getValidToken(server: RemoteServer): Promise<string | null> {
    const stored = this.tokens.get(server.id);
    if (!stored) {
      return null;
    }

    // Check if token is expired or about to expire
    if (stored.expiresAt && stored.expiresAt - Date.now() < TOKEN_REFRESH_THRESHOLD_MS) {
      if (stored.refreshToken) {
        // Try to refresh the token
        const refreshed = await this.refreshToken(server, stored);
        if (refreshed) {
          return refreshed.accessToken;
        }
      }
      // Token expired and can't refresh
      return null;
    }

    return stored.accessToken;
  }

  /** Refresh access token using refresh token */
  async refreshToken(
    server: RemoteServer,
    stored: StoredOAuthTokens
  ): Promise<StoredOAuthTokens | null> {
    if (!stored.refreshToken) {
      return null;
    }

    try {
      // Discover auth server to get token endpoint
      const discovery = await this.discoverAuthServer(server);
      if (!discovery) {
        return null;
      }

      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: stored.refreshToken,
      });

      // Add client_id if we have one configured
      if (server.oauth?.clientId) {
        params.set("client_id", server.oauth.clientId);
        if (server.oauth.clientSecret) {
          params.set("client_secret", server.oauth.clientSecret);
        }
      }

      const response = await fetch(discovery.metadata.token_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        log.debug("Token refresh failed:", response.status);
        return null;
      }

      const tokenResponse = (await response.json()) as TokenResponse;

      const newTokens: StoredOAuthTokens = {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type || "Bearer",
        refreshToken: tokenResponse.refresh_token || stored.refreshToken,
        scopes: tokenResponse.scope?.split(" ") || stored.scopes,
        expiresAt: tokenResponse.expires_in
          ? Date.now() + tokenResponse.expires_in * 1000
          : undefined,
      };

      this.tokens.set(server.id, newTokens);
      this.saveTokens();

      return newTokens;
    } catch (error) {
      log.debug("Error refreshing token:", error);
      return null;
    }
  }

  /** Check if a server has valid OAuth tokens */
  hasValidToken(serverId: string): boolean {
    const stored = this.tokens.get(serverId);
    if (!stored) {
      return false;
    }

    // Check expiration
    if (stored.expiresAt && stored.expiresAt < Date.now()) {
      return false;
    }

    return true;
  }

  /** Remove token for a server */
  removeToken(serverId: string): void {
    this.tokens.delete(serverId);
    this.saveTokens();
  }

  /** Clear all tokens */
  clearAllTokens(): void {
    this.tokens.clear();
    this.saveTokens();
  }

  /** Get token preview (masked) */
  getTokenPreview(serverId: string): string | null {
    const stored = this.tokens.get(serverId);
    if (!stored) {
      return null;
    }

    const token = stored.accessToken;
    if (token.length <= 8) {
      return "****";
    }

    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  /** Check if token is expired */
  isTokenExpired(serverId: string): boolean {
    const stored = this.tokens.get(serverId);
    if (!stored || !stored.expiresAt) {
      return false;
    }

    return stored.expiresAt < Date.now();
  }

  // === Utility Methods ===

  /** Check if a server requires OAuth */
  serverRequiresOAuth(server: RemoteServer): boolean {
    return server.oauth?.enabled === true;
  }

  /** Get all servers with pending auth */
  getPendingAuthServers(): string[] {
    return Array.from(this.pendingAuths.values()).map((p) => p.serverId);
  }

  /** Cancel pending auth for a server */
  cancelPendingAuth(serverId: string): void {
    for (const [state, auth] of this.pendingAuths) {
      if (auth.serverId === serverId) {
        this.pendingAuths.delete(state);
      }
    }
    this.savePendingAuths();
  }

  /** Clean up expired pending authorizations */
  cleanupExpiredAuths(): void {
    const now = Date.now();
    for (const [state, auth] of this.pendingAuths) {
      if (now - auth.createdAt > AUTH_TIMEOUT_MS) {
        this.pendingAuths.delete(state);
      }
    }
    this.savePendingAuths();
  }

  /** Open URL in default browser */
  async openBrowser(url: string): Promise<boolean> {
    try {
      const { default: open } = await import("open");
      await open(url);
      return true;
    } catch {
      // Fallback to platform-specific commands
      const { exec } = await import("child_process");
      const platform = process.platform;

      let command: string;
      if (platform === "darwin") {
        command = `open "${url}"`;
      } else if (platform === "win32") {
        command = `start "" "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      return new Promise((resolve) => {
        exec(command, (error) => {
          if (error) {
            log.debug("Failed to open browser:", error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    }
  }

  /** Get pending authorization state for a server */
  getPendingAuthState(serverId: string): string | null {
    for (const [state, pending] of this.pendingAuths.entries()) {
      if (pending.serverId === serverId) {
        return state;
      }
    }
    return null;
  }
}

/** Singleton instance */
let instance: AuthService | null = null;

/** Get or create the auth service instance */
export function getAuthService(configDir?: string): AuthService {
  if (!instance) {
    instance = new AuthService(configDir);
  }
  return instance;
}

/** Reset the singleton instance (for testing) */
export function resetAuthService(): void {
  if (instance) {
    instance.stopCallbackServer();
  }
  instance = null;
}

export default AuthService;
