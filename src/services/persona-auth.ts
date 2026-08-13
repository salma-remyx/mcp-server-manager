/**
 * Persona × credential classification for managed MCP server auth.
 *
 * Adapted from "A Gateway Architecture for Enterprise MCP Authentication"
 * (arXiv:2608.10760v1). The paper's first contribution is a two-axis model
 * — persona (interactive user vs. automated non-user) crossed with credential
 * type (no-auth / static or dynamic API key / PKCE / client credentials) —
 * used by a centralized gateway to authorize callers and record who reached a
 * backend. This module realizes that classification over the manager's
 * existing auth state and stamps it onto stored tokens so the governance
 * signal travels with the credential.
 *
 * Mode 2 (adapted port): the paper's model IS a rule-based classification,
 * not a learned estimator, so the core mechanism is preserved verbatim with
 * no auxiliary component substituted. The paper's RFC 8693 token-exchange
 * delegation, enterprise SSO grants, and deployment-topology contributions
 * are intentionally out of scope — they require gateway-side infrastructure
 * (token-exchange endpoint, SSO provider, edge/perimeter deployment) this CLI
 * does not host, and collapsing them to a proxy would not preserve the idea.
 */

import type {
  PersonaCredentialClass,
  RemoteServer,
  StoredOAuthTokens,
} from "../types/index.js";

/**
 * Classify a (server, token) pair onto the paper's two-axis auth model.
 *
 * Rules, most-specific first:
 *   1. Stored OAuth token present → a dynamic credential the gateway obtained
 *      through its own interactive authorization_code + PKCE flow, so the
 *      persona is an interactive user (Generate-Your-Own-Token,
 *      User-to-OAuth2). The token store only ever holds gateway-issued OAuth
 *      tokens, so token presence is sufficient evidence of this flow.
 *   2. Static bearer / API key on the server config → a caller-supplied
 *      credential for an automated (service) caller (Bring-Your-Own-Token,
 *      Non-user-to-Service-Account).
 *   3. OAuth client-credentials config without an issued token → a machine
 *      client. Recognized for taxonomy completeness; the manager does not yet
 *      issue client_credentials tokens.
 *   4. Otherwise → no auth.
 */
export function classifyPersonaAuth(
  server: RemoteServer | undefined,
  tokens: StoredOAuthTokens | null
): PersonaCredentialClass {
  // (1) Dynamic OAuth token obtained via the gateway's interactive PKCE flow.
  if (tokens) {
    return {
      persona: "interactive-user",
      credentialType: "dynamic-oauth-pkce",
      provisioningModel: "generate-your-own",
      identityFlow: "user-to-oauth2",
      reason: "OAuth token issued via interactive authorization_code + PKCE",
    };
  }

  // (2) Static bearer / API key configured on the server.
  if (server?.bearerToken) {
    return {
      persona: "automated-non-user",
      credentialType: "static-api-key",
      provisioningModel: "bring-your-own",
      identityFlow: "non-user-to-service-account",
      reason: "Static bearer/API key supplied in server config",
    };
  }

  // (3) Client-credentials config (machine client), no token issued yet.
  if (server?.oauth?.enabled && server.oauth.clientId && server.oauth.clientSecret) {
    return {
      persona: "automated-non-user",
      credentialType: "client-credentials",
      provisioningModel: "generate-your-own",
      identityFlow: "non-user-to-service-account",
      reason: "OAuth client_credentials configured (machine client)",
    };
  }

  // (4) No credential provisioned.
  return {
    persona: "automated-non-user",
    credentialType: "none",
    reason: "No credential configured",
  };
}

/**
 * Return a copy of `tokens` with the persona × credential classification
 * stamped onto it, so the governance signal persists alongside the credential.
 */
export function stampPersonaClass(
  tokens: StoredOAuthTokens,
  klass: PersonaCredentialClass
): StoredOAuthTokens {
  return { ...tokens, personaClass: klass };
}
