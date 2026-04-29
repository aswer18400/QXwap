import { createRouter, publicQuery } from "./middleware";
import { itemRouter } from "./routers/item";
import { profileRouter } from "./routers/profile";
import { bookmarkRouter } from "./routers/bookmark";
import { followRouter } from "./routers/follow";
import { offerRouter } from "./routers/offer";
import { walletRouter } from "./routers/wallet";
import { notificationRouter } from "./routers/notification";
import { dealRouter } from "./routers/deal";
import { shipmentRouter } from "./routers/shipment";
import { chatRouter } from "./routers/chat";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  item: itemRouter,
  profile: profileRouter,
  bookmark: bookmarkRouter,
  follow: followRouter,
  offer: offerRouter,
  wallet: walletRouter,
  notification: notificationRouter,
  deal: dealRouter,
  shipment: shipmentRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
