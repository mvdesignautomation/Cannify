export type CannifyErrorCode =
  | "invalid-quantity"
  | "insufficient-quantity"
  | "invalid-dates"
  | "missing-name"
  | "missing-item"
  | "missing-batch"
  | "missing-reason"
  | "note-too-long"
  | "invalid-qr"
  | "not-deleted"
  | "already-deleted"
  | "database";

export class CannifyError extends Error {
  readonly code: CannifyErrorCode;

  constructor(code: CannifyErrorCode, message: string) {
    super(message);
    this.name = "CannifyError";
    this.code = code;
  }
}

export function userFacingError(error: unknown): string {
  if (error instanceof CannifyError) return error.message;
  return "Something went wrong. Your data was not changed. Try again.";
}
