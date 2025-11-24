/**
 * Authentication-related type definitions
 */

/** OAuth token response */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/** OAuth authorization server metadata */
export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}

/** PKCE data for OAuth flow */
export interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
}

/** Dynamic client registration response */
export interface ClientRegistration {
  client_id: string;
  client_secret?: string;
  redirect_uris?: string[];
}

/** Auth status for a server */
export interface AuthStatus {
  serverId: string;
  serverName: string;
  hasToken: boolean;
  tokenPreview?: string;
  isOAuth?: boolean;
}

/** Auth operation result */
export interface AuthResult {
  success: boolean;
  error?: string;
  token?: string;
}
