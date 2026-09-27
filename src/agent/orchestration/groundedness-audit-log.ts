// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
export interface GroundednessAuditEntry {
  question: string;
  candidateIds: string[];
  answer: string;
}

// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
export const logGroundednessAudit = ({ question, candidateIds, answer }: GroundednessAuditEntry): void => {
  console.log("[groundedness-audit]", JSON.stringify({ question, candidateIds, answer }));
};
