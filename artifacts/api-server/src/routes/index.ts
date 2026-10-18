import { Router, type IRouter } from "express";
import healthRouter from "./health";
import enquiriesRouter from "./enquiries";
import platformRouter from "./platform";

const router: IRouter = Router();

router.use("/platform", platformRouter);
router.use(healthRouter);
router.use(enquiriesRouter);

export default router;
