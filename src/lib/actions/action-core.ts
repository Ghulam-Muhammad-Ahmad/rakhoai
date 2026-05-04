export type ActionStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "STUDENT_SAVED" | "STUDENT_LOST";

const terminalStatuses = new Set<ActionStatus>(["DONE", "STUDENT_SAVED", "STUDENT_LOST"]);

export function isActionStatus(value: unknown): value is ActionStatus {
  return (
    value === "PENDING" ||
    value === "IN_PROGRESS" ||
    value === "DONE" ||
    value === "STUDENT_SAVED" ||
    value === "STUDENT_LOST"
  );
}

export function isTerminalActionStatus(status: ActionStatus): boolean {
  return terminalStatuses.has(status);
}

export function buildActionStatusUpdate(
  input: { status: ActionStatus; notes?: string | null },
  now = new Date()
) {
  return {
    status: input.status,
    notes: input.notes,
    updatedAt: now.toISOString(),
    takenAt: isTerminalActionStatus(input.status) ? now.toISOString() : undefined,
  };
}
