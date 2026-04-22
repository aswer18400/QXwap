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

export default router;
