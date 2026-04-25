import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import authRouter from "./auth";
import itemsRouter from "./items";
import offersRouter from "./offers";
import profilesRouter from "./profiles";
import chatRouter from "./chat";
import bookmarksRouter from "./bookmarks";
import dealsRouter from "./deals";
import notificationsRouter from "./notifications";
import walletRouter from "./wallet";
import shipmentsRouter from "./shipments";
import offerChatsRouter from "./offer_chats";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(authRouter);
router.use(itemsRouter);
router.use(offersRouter);
router.use(profilesRouter);
router.use(bookmarksRouter);
router.use(dealsRouter);
router.use(chatRouter);
router.use(notificationsRouter);
router.use(walletRouter);
router.use(shipmentsRouter);
router.use(offerChatsRouter);
router.use(uploadRouter);

export default router;
