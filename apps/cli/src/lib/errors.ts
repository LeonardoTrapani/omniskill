export function readErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: string;
      shape?: { message?: string };
    };

    if (typeof candidate.shape?.message === "string") {
      return candidate.shape.message;
    }

    if (typeof candidate.message === "string") {
      return candidate.message;
    }
  }

  return String(error);
}
