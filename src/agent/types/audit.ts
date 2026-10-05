// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
export interface GroundednessAuditEntry {
  question: string;
  candidateIds: string[];
  answer: string;
}
