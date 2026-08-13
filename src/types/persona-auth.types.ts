/**
 * Persona × credential classification for MCP server authentication.
 *
 * Adapted from "A Gateway Architecture for Enterprise MCP Authentication:
 * Unifying Heterogeneous Auth, Identity Delegation, and the User / Non-User
 * Persona Problem" (arXiv:2608.10760v1), Contribution #1: a two-axis
 * authentication model crossing *persona* (interactive user vs. automated
 * non-user) with *credential type* (no-auth, static/dynamic API key, PKCE,
 * client credentials).
 *
 * The classification is the governance primitive a centralized gateway uses
 * to authorize callers and record *who* — or *what* — reached a backend MCP
 * server, which is the auditability gap the paper is motivated by. These
 * types carry no imports so they can be referenced from the
 * {@link StoredOAuthTokens} contract without a type cycle.
 */

/** Caller persona axis: who is reaching the backend. */
export type Persona = "interactive-user" | "automated-non-user";

/**
 * Credential type axis (paper's two-axis model). `none` covers the paper's
 * "no-auth" servers; `static-api-key` covers static/dynamic API keys;
 * `dynamic-oauth-pkce` covers the interactive PKCE grant; `client-credentials`
 * covers the machine/client-credentials grant.
 */
export type CredentialType =
  | "none"
  | "static-api-key"
  | "dynamic-oauth-pkce"
  | "client-credentials";

/**
 * How the gateway sources the credential it presents downstream (paper's
 * three token-provisioning models). "bring-your-own" = caller-supplied
 * credential; "generate-your-own" = gateway-obtained credential. The paper's
 * third model, delegated OAuth via RFC 8693 token exchange, is intentionally
 * out of scope here — it requires gateway-side token-exchange infrastructure
 * this CLI does not host.
 */
export type TokenProvisioningModel = "bring-your-own" | "generate-your-own";

/**
 * End-to-end identity flow the gateway composes for the caller (paper's
 * three identity flows). Only the two flows the manager can actually compose
 * today are modelled; the paper's third flow, User-to-Service-Account (RFC
 * 8693 delegation), is omitted for the same reason as delegated provisioning
 * above.
 */
export type IdentityFlow = "user-to-oauth2" | "non-user-to-service-account";

/**
 * Result of classifying a (server, token) pair onto the two-axis model.
 *
 * Every field is a plain string/enum so the object is JSON-serializable and
 * can be stamped onto stored tokens for audit/governance trails.
 */
export interface PersonaCredentialClass {
  /** Persona axis: who is calling. */
  persona: Persona;
  /** Credential axis: what they authenticate with. */
  credentialType: CredentialType;
  /** How the gateway sources the presented credential, if any. */
  provisioningModel?: TokenProvisioningModel;
  /** Composed identity flow, if a credential is provisioned. */
  identityFlow?: IdentityFlow;
  /** Short human-readable rationale, for logs and audit trails. */
  reason: string;
}
