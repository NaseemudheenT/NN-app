/**
 * NN's permission vocabulary.
 *
 * Five tiers, ordered by how much damage a mistake can do. REN is granted
 * scopes at a tier; the tier decides whether an action can proceed silently,
 * needs confirmation, or needs the founder to authenticate again.
 */

export const PERMISSION_TIERS = ["read", "create", "modify", "external", "security"] as const;
export type PermissionTier = (typeof PERMISSION_TIERS)[number];

export type ApprovalRequirement = "none" | "confirm" | "reauthenticate";

/**
 * What each tier demands before an action runs. `read`, `create` and `modify`
 * run without interruption once granted — re-asking for permission on work the
 * founder has already authorised is friction, not safety. The last two tiers
 * always stop and ask.
 */
export const TIER_APPROVAL: Record<PermissionTier, ApprovalRequirement> = {
  read: "none",
  create: "none",
  modify: "none",
  external: "confirm",
  security: "reauthenticate",
};

/**
 * Actions that always stop and ask, regardless of any granted scope or
 * standing automation. This list is the floor, not the ceiling — it can never
 * be lowered by configuration, and an automation cannot chain around it.
 */
export const ALWAYS_CONFIRM = [
  "send_message",
  "send_email",
  "publish_content",
  "make_purchase",
  "transfer_money",
  "execute_trade",
  "delete_permanently",
  "share_sensitive_data",
  "unlock_door",
  "disable_alarm",
  "grant_permission",
  "change_security_setting",
  "connect_external_account",
] as const;

export type SensitiveAction = (typeof ALWAYS_CONFIRM)[number];

export function isSensitive(action: string): action is SensitiveAction {
  return (ALWAYS_CONFIRM as readonly string[]).includes(action);
}

export interface PermissionGrant {
  scope: string;
  tier: PermissionTier;
  grantedAt: string;
  /** ISO timestamp, or null for an open-ended grant. */
  expiresAt: string | null;
  revoked: boolean;
}

export interface PermissionDecision {
  allowed: boolean;
  approval: ApprovalRequirement;
  reason: string;
}

/**
 * The single place that decides whether REN may do something.
 *
 * Deliberately pessimistic: an unknown scope, a revoked grant and an expired
 * grant all fail closed. A sensitive action is escalated even when the grant
 * would otherwise allow it silently — this is what stops a broad "modify"
 * grant from being used to send email.
 */
export function decide(
  action: string,
  requiredScope: string,
  grants: readonly PermissionGrant[],
  now: Date = new Date(),
): PermissionDecision {
  const grant = grants.find((g) => g.scope === requiredScope);

  if (grant === undefined) {
    return { allowed: false, approval: "confirm", reason: `No grant for scope "${requiredScope}".` };
  }
  if (grant.revoked) {
    return { allowed: false, approval: "confirm", reason: `Scope "${requiredScope}" was revoked.` };
  }
  if (grant.expiresAt !== null && new Date(grant.expiresAt).getTime() <= now.getTime()) {
    return { allowed: false, approval: "confirm", reason: `Scope "${requiredScope}" expired.` };
  }

  // A sensitive action never runs silently, whatever the grant says.
  if (isSensitive(action)) {
    const approval: ApprovalRequirement =
      TIER_APPROVAL[grant.tier] === "reauthenticate" ? "reauthenticate" : "confirm";
    return { allowed: true, approval, reason: `"${action}" always requires explicit approval.` };
  }

  return { allowed: true, approval: TIER_APPROVAL[grant.tier], reason: "Granted." };
}
