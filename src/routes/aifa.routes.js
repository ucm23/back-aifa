import { Router } from "express";
import {
    valideFligth
} from "../controllers/aifa.controller.js";

const router = Router();

router.post("/", valideFligth);

export default router;
