import { api } from "../lib/api";
import type { OfferDetail, OfferSummary, Shipment } from "../lib/types";

type CreateSwapPayload = {
  target_item_id: string;
  message?: string;
  cash_amount?: number;
  credit_amount?: number;
  item_ids?: string[];
  instant_swap?: boolean;
  shipping_payer?: "split" | "requester" | "owner";
  pickup_window?: string;
};

export const swapService = {
  async listOffers() {
    const response = await api<{ offers: OfferSummary[] }>("/offers");
    return response.offers || [];
  },

  async listSentOffers() {
    const response = await api<{ offers: OfferSummary[] }>("/offers/sent");
    return response.offers || [];
  },

  async listReceivedOffers() {
    const response = await api<{ offers: OfferSummary[] }>("/offers/received");
    return response.offers || [];
  },

  async getOfferSummary(offerId: string) {
    const response = await api<{ offer: OfferSummary }>(`/offers/${offerId}`);
    return response.offer;
  },

  async getOfferDetail(offerId: string) {
    return await api<OfferDetail>(`/offers/${offerId}/detail`);
  },

  async createSwapRequest(payload: CreateSwapPayload) {
    return await api<{ offer_id: string; conversation_id: string | null }>("/offers", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async acceptSwapRequest(offerId: string) {
    return await api<{ ok: boolean; status: string }>(`/offers/${offerId}/accept`, { method: "POST", body: JSON.stringify({}) });
  },

  async approveSwapRequest(offerId: string) {
    return await api<{ ok: boolean; status: string }>(`/offers/${offerId}/approve`, { method: "POST", body: JSON.stringify({}) });
  },

  async counterSwapRequest(
    offerId: string,
    payload: { message?: string; cash_amount?: number; credit_amount?: number }
  ) {
    return await api<{ ok: boolean; status: string }>(`/offers/${offerId}/counter`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async rejectSwapRequest(offerId: string, rejection_reason?: string) {
    return await api<{ ok: boolean; status: string }>(`/offers/${offerId}/reject`, {
      method: "POST",
      body: JSON.stringify({ rejection_reason })
    });
  },

  async cancelSwapRequest(offerId: string) {
    return await api<{ ok: boolean; status: string }>(`/offers/${offerId}/cancel`, { method: "POST", body: JSON.stringify({}) });
  },

  async updateSwapLogistics(offerId: string, logistics: Record<string, unknown>) {
    return await api<{ ok: boolean; logistics: Record<string, unknown> }>(`/offers/${offerId}/logistics`, {
      method: "PATCH",
      body: JSON.stringify({ logistics })
    });
  },

  async startShipment(offerId: string, payload: Record<string, unknown>) {
    return await api<{ shipment: Shipment }>(`/shipments/${offerId}/start`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getShipment(offerId: string) {
    const response = await api<{ shipment: Shipment | null }>(`/shipments/${offerId}`);
    return response.shipment;
  },

  async updateShipmentStep(shipmentId: string, payload: Record<string, unknown>) {
    return await api<{ ok: boolean }>(`/shipments/${shipmentId}/update-step`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async finishShipment(shipmentId: string, payload: Record<string, unknown> = {}) {
    return await api<{ ok: boolean }>(`/shipments/${shipmentId}/finish`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async confirmSwapReceipt(offerId: string) {
    return await api<{ ok: boolean; status: string; confirmed: boolean }>(`/offers/${offerId}/confirm-receipt`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },

  async requestSwapReturn(offerId: string, reason: string) {
    return await api<{ ok: boolean; logistics: Record<string, unknown> }>(`/offers/${offerId}/request-return`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  async reportSwapIssue(offerId: string, payload: { reason: string; description?: string }) {
    return await api<{ report: any; status: string }>(`/offers/${offerId}/report`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async listDeals() {
    const response = await api<{ deals: any[] }>("/deals/mine");
    return response.deals || [];
  },

  async getDeal(dealId: string) {
    const response = await api<{ deal: any }>(`/deals/${dealId}`);
    return response.deal;
  }
};
