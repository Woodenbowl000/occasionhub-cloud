import express from "express";
import {
  signup,
  signin,
  googleSignin,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  getMe,
} from "../controllers/authController";
import { hybridAuth } from "../middleware/hybridAuthMiddleware";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/google", googleSignin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", hybridAuth(), getMe);
router.put("/password", hybridAuth(), changePassword);
router.put("/profile", hybridAuth(), updateProfile);

export default router;
