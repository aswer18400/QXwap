import { loadFeed } from "./feed.js";
import { loadShop } from "./shop.js";
import { loadInbox } from "./inbox.js";
import { loadProfile } from "./profile.js";

export async function refreshAllData({ stayOnScreen = true } = {}) {
  const tasks = [loadFeed(), loadShop(), loadInbox(), loadProfile()];
  const results = await Promise.allSettled(tasks);
  if (!stayOnScreen) {
    return results;
  }
  return results;
}
