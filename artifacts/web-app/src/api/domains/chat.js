export function createChatApi(api) {
  return {
    conversations: () => api.get("/chat/conversations"),
    messages: (convId) => api.get(`/chat/conversations/${convId}/messages`),
    send: (convId, text) => api.post(`/chat/conversations/${convId}/messages`, { text }),
  };
}
