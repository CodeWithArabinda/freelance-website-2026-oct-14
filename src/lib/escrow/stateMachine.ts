import { ContractStatus, Role } from "../types";

export type EscrowAction =
  | "FUND_ESCROW"
  | "START_WORK"
  | "SUBMIT_WORK"
  | "REQUEST_REVISION"
  | "APPROVE_WORK"
  | "RELEASE_FUNDS"
  | "FILE_DISPUTE"
  | "RESOLVE_RELEASE"
  | "RESOLVE_REFUND"
  | "CANCEL";

export class EscrowTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowTransitionError";
  }
}

export interface TransitionRule {
  from: ContractStatus;
  action: EscrowAction;
  to: ContractStatus;
  allowedRoles: Role[];
  description: string;
}

export const ESCROW_TRANSITION_RULES: TransitionRule[] = [
  // From CREATED
  {
    from: "CREATED",
    action: "FUND_ESCROW",
    to: "FUNDED_SIMULATED",
    allowedRoles: ["CLIENT"],
    description: "Client simulates funding the escrow for the contract",
  },
  {
    from: "CREATED",
    action: "CANCEL",
    to: "CANCELLED",
    allowedRoles: ["CLIENT"],
    description: "Client cancels unfunded contract",
  },

  // From FUNDED_SIMULATED
  {
    from: "FUNDED_SIMULATED",
    action: "START_WORK",
    to: "IN_PROGRESS",
    allowedRoles: ["FREELANCER"],
    description: "Freelancer begins work on funded contract",
  },
  {
    from: "FUNDED_SIMULATED",
    action: "SUBMIT_WORK",
    to: "SUBMITTED",
    allowedRoles: ["FREELANCER"],
    description: "Freelancer delivers work directly from funded status",
  },
  {
    from: "FUNDED_SIMULATED",
    action: "FILE_DISPUTE",
    to: "DISPUTED",
    allowedRoles: ["CLIENT", "FREELANCER"],
    description: "Either party files a dispute on the funded contract",
  },
  {
    from: "FUNDED_SIMULATED",
    action: "RESOLVE_REFUND",
    to: "REFUNDED_SIMULATED",
    allowedRoles: ["ADMIN"],
    description: "Admin approves mutual refund before work starts",
  },

  // From IN_PROGRESS
  {
    from: "IN_PROGRESS",
    action: "SUBMIT_WORK",
    to: "SUBMITTED",
    allowedRoles: ["FREELANCER"],
    description: "Freelancer submits deliverables for review",
  },
  {
    from: "IN_PROGRESS",
    action: "FILE_DISPUTE",
    to: "DISPUTED",
    allowedRoles: ["CLIENT", "FREELANCER"],
    description: "Dispute opened during active development",
  },

  // From SUBMITTED
  {
    from: "SUBMITTED",
    action: "APPROVE_WORK",
    to: "APPROVED",
    allowedRoles: ["CLIENT"],
    description: "Client approves submitted deliverables",
  },
  {
    from: "SUBMITTED",
    action: "REQUEST_REVISION",
    to: "IN_PROGRESS",
    allowedRoles: ["CLIENT"],
    description: "Client requests revision of work",
  },
  {
    from: "SUBMITTED",
    action: "FILE_DISPUTE",
    to: "DISPUTED",
    allowedRoles: ["CLIENT", "FREELANCER"],
    description: "Dispute opened during delivery review",
  },

  // From APPROVED
  {
    from: "APPROVED",
    action: "RELEASE_FUNDS",
    to: "RELEASED_SIMULATED",
    allowedRoles: ["CLIENT", "ADMIN"],
    description: "Client or system releases simulated funds to freelancer",
  },

  // From DISPUTED
  {
    from: "DISPUTED",
    action: "RESOLVE_RELEASE",
    to: "RELEASED_SIMULATED",
    allowedRoles: ["ADMIN"],
    description: "Administrator resolves dispute in favor of freelancer",
  },
  {
    from: "DISPUTED",
    action: "RESOLVE_REFUND",
    to: "REFUNDED_SIMULATED",
    allowedRoles: ["ADMIN"],
    description: "Administrator resolves dispute by refunding simulated funds to client",
  },
];

/**
 * Validates whether a state transition is legal and authorized.
 * Throws EscrowTransitionError if illegal.
 */
export function validateEscrowTransition(
  currentStatus: ContractStatus,
  action: EscrowAction,
  actorRole: Role
): ContractStatus {
  // Check if contract is already terminal
  if (
    currentStatus === "RELEASED_SIMULATED" ||
    currentStatus === "REFUNDED_SIMULATED" ||
    currentStatus === "CANCELLED"
  ) {
    throw new EscrowTransitionError(
      `Cannot perform action "${action}" on terminal contract state "${currentStatus}".`
    );
  }

  // Cannot do ordinary release on disputed contract
  if (currentStatus === "DISPUTED" && (action === "APPROVE_WORK" || action === "RELEASE_FUNDS")) {
    throw new EscrowTransitionError(
      `A disputed contract cannot be released through the ordinary path. Requires administrator resolution.`
    );
  }

  const rule = ESCROW_TRANSITION_RULES.find(
    (r) => r.from === currentStatus && r.action === action
  );

  if (!rule) {
    throw new EscrowTransitionError(
      `Invalid transition: Action "${action}" is not permitted when contract status is "${currentStatus}".`
    );
  }

  if (!rule.allowedRoles.includes(actorRole)) {
    throw new EscrowTransitionError(
      `Unauthorized: Role "${actorRole}" is not permitted to perform "${action}" on contract in state "${currentStatus}". Required roles: ${rule.allowedRoles.join(
        ", "
      )}.`
    );
  }

  return rule.to;
}
