import { Router } from "express";
import { index, login } from "../controllers/index.rotes.js";

const router = Router();

//router.get("/", index);
router.post("/", login);

//router.get("/ping", ping);

export default router;
