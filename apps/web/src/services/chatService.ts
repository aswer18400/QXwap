import { api } from "../lib/api";
import type { ChatConversation, ChatMessage } from "../lib/types";

export const chatService = {
  async listConversations() {
    const response = await api<{ conversations: ChatConversation[] }>("/chat/conversations");
    return response.conversations || [];
  },

  async createThreadFromSwap(offerId: string) {
    const response = await api<{ conversation_id: string }>(`/chat/from-swap/${offerId}`, {
      method: "POST",
      body: JSON.stringify({})
    });
    return response.conversation_id;
  },

  async getMessages(conversationId: string) {
    const response = await api<{ messages: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`);
    return response.messages || [];
  },

  async sendMessage(conversationId: string, text: string) {
    const response = await api<{ message: ChatMessage }>(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text })
    });
    return response.message;
  }
};

