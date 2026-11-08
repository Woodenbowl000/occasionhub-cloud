import express from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavoriteStatus,
} from "../controllers/favoriteController";
import { hybridAuth } from "../middleware/hybridAuthMiddleware";

const router = express.Router();

router.get("/", hybridAuth(), getFavorites);
router.get("/check/:venueId", hybridAuth(), checkFavoriteStatus);
router.post("/", hybridAuth(), addFavorite);
router.delete("/:id", hybridAuth(), removeFavorite);

export default router;
