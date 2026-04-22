import { type Response } from "express";

interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const payload: ErrorResponse = {
    error: message,
    code,
  };

  if (details !== undefined) {
    payload.details = details;
  }

  return res.status(status).json(payload);
}

export function formatZodIssues(error: {
  issues: Array<{ code: string; path: PropertyKey[]; message: string }>;
}) {
  return error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

export function sendValidationError(
  res: Response,
  message: string,
  error: {
    issues: Array<{ code: string; path: PropertyKey[]; message: string }>;
  },
) {
  return sendError(res, 400, "bad_request", message, formatZodIssues(error));
}
