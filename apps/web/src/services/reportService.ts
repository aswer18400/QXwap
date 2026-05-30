import { api } from "../lib/api";
import type { ReportRecord } from "../lib/types";

type CreateReportPayload = {
  target_type: string;
  target_id: string;
  reason: string;
  description?: string;
};

export const reportService = {
  async createReport(payload: CreateReportPayload) {
    const response = await api<{ report: ReportRecord }>("/reports", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return response.report;
  }
};

