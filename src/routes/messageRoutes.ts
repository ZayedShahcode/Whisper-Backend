import {Router} from "express";
import { protectRoute } from "../middleware/auth";
import { messageController } from "../controllers/messageController";


const router = Router();

router.get("/chat/:chatId",protectRoute,messageController)

export default router;