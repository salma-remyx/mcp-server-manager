/**
 * Authentication-related type definitions
 */

/** OAuth token response from token endpoint */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/** OAuth authorization server metadata (RFC 8414) */
export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  client_id_metadata_document_supported?: boolean;
}

/** OAuth protected resource metadata (RFC 9728) */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers?: string[];
  bearer_methods_supported?: string[];
  resource_signing_alg_values_supported?: string[];
  resource_documentation?: string;
  scopes_supported?: string[];
}

/** PKCE data for OAuth flow */
export interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

/** Dynamic client registration request (RFC 7591) */
export interface ClientRegistrationRequest {
  redirect_uris: string[];
  client_name: string;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  software_id?: string;
  software_version?: string;
}

/** Dynamic client registration response (RFC 7591) */
export interface ClientRegistration {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}

/** Pending OAuth authorization state */
export interface PendingAuthorization {
  serverId: string;
  serverUrl: string;
  pkce: PKCEData;
  state: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
  createdAt: number;
}

/** Auth status for a server */
export interface AuthStatus {
  serverId: string;
  serverName: string;
  hasToken: boolean;
  tokenPreview?: string;
  isOAuth: boolean;
  isExpired?: boolean;
  expiresAt?: number;
  requiresAuth?: boolean;
  authInProgress?: boolean;
}

/** Auth operation result */
export interface AuthResult {
  success: boolean;
  error?: string;
  token?: string;
  expiresAt?: number;
  refreshToken?: string;
}

/** OAuth callback result from the redirect */
export interface OAuthCallbackResult {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/** Server auth requirements detected from 401 response */
export interface ServerAuthRequirements {
  requiresAuth: boolean;
  resourceMetadataUrl?: string;
  realm?: string;
  scope?: string;
  error?: string;
  errorDescription?: string;
}
