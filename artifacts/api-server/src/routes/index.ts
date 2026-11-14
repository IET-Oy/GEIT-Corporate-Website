import { Router, type IRouter } from "express";
import healthRouter from "./health";
import enquiriesRouter from "./enquiries";

// Energy DT's API (/api/platform/*) now lives in the separate IET-Oy/IET-Oy-Energy-DT repository.
const router: IRouter = Router();

router.use(healthRouter);
router.use(enquiriesRouter);

export default router;
