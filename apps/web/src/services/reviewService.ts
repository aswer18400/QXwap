import { api } from "../lib/api";
import type { Review } from "../lib/types";
import { buildQuery } from "./service-utils";

type CreateReviewPayload = {
  reviewee_user_id: string;
  offer_id?: string;
  rating: number;
  comment?: string;
};

export const reviewService = {
  async listReviews(query: { reviewee_user_id?: string; reviewer_user_id?: string } = {}) {
    const qs = buildQuery(query);
    const response = await api<{ reviews: Review[] }>(qs ? `/reviews?${qs}` : "/reviews");
    return response.reviews || [];
  },

  async createReview(payload: CreateReviewPayload) {
    const response = await api<{ review: Review }>("/reviews", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return response.review;
  }
};

