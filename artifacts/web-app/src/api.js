import { BASE, queryString, request, uploadRequest } from "./api/core.js";
import { createAuthApi } from "./api/domains/auth.js";
import { createItemsApi } from "./api/domains/items.js";
import { createOffersApi } from "./api/domains/offers.js";
import { createProfilesApi } from "./api/domains/profile.js";
import { createBookmarksApi } from "./api/domains/bookmarks.js";
import { createWalletApi } from "./api/domains/wallet.js";
import { createNotificationsApi } from "./api/domains/notifications.js";
import { createDealsApi } from "./api/domains/deals.js";
import { createShipmentsApi } from "./api/domains/shipments.js";
import { createChatApi } from "./api/domains/chat.js";
import { createUploadsApi } from "./api/domains/uploads.js";

export const api = {
  get: (p) => request("GET", p),
  post: (p, body) => request("POST", p, body),
  patch: (p, body) => request("PATCH", p, body),
  del: (p) => request("DELETE", p),
};

export const auth = createAuthApi(api, BASE);
export const items = createItemsApi(api, queryString);
export const offers = createOffersApi(api);
export const profiles = createProfilesApi(api);
export const bookmarks = createBookmarksApi(api);
export const wallet = createWalletApi(api, queryString);
export const notifications = createNotificationsApi(api);
export const deals = createDealsApi(api);
export const shipments = createShipmentsApi(api);
export const chat = createChatApi(api);
export const uploads = createUploadsApi(uploadRequest);
