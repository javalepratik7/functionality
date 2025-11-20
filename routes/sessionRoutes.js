// routes/sessionRoutes.js
import express from "express";
import { createSession, getSession } from "../controllers/sessionController.js";

const router = express.Router();

router.post("/create", createSession);
router.get("/:userId", getSession);

export default router;