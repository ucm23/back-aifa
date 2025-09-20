import { Router } from "express";
import { login } from "../controllers/index.rotes.js";

const router = Router();

router.post("/", login);

export default router;
