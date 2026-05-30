import { api } from "../lib/api";
import type { NotificationEntry } from "../lib/types";

export const notificationService = {
  async listNotifications() {
    const response = await api<{ notifications: NotificationEntry[] }>("/notifications");
    return response.notifications || [];
  },

  async markAllRead() {
    await api("/notifications/read", { method: "POST", body: JSON.stringify({}) });
  },

  async markNotificationRead(notificationId: string) {
    await api("/notifications/read", { method: "POST", body: JSON.stringify({ id: notificationId }) });
  },

  async getUnreadCount() {
    const response = await api<{ unread_count: number }>("/notifications/unread-count");
    return Number(response.unread_count || 0);
  }
};

