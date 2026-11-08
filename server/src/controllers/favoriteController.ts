import { Request, Response } from "express";
import prisma from "../lib/prisma";


export const getFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        venue: {
          include: {
            location: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(favorites);
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { venueId } = req.body;
    const userId = req.user?.id;

    if (userId === undefined || userId === null) {
      res.status(401).json({ message: "Unauthorized - No user ID" });
      return;
    }

    // Check if already favorited
    const existing = await prisma.favorite.findFirst({
      where: { userId, venueId },
    });

    if (existing) {
      res.status(400).json({ message: "Venue already in favorites" });
      return;
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        venueId,
      },
      include: {
        venue: {
          include: {
            location: true,
          },
        },
      },
    });

    res.status(201).json(favorite);
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if favorite exists and belongs to user
    const favorite = await prisma.favorite.findUnique({
      where: { id: parseInt(id) },
    });

    if (!favorite) {
      res.status(404).json({ message: "Favorite not found" });
      return;
    }

    if (favorite.userId !== userId) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    await prisma.favorite.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Removed from favorites" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkFavoriteStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { venueId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(200).json({ isFavorite: false });
      return;
    }

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId,
        venueId: parseInt(venueId),
      },
    });

    res.status(200).json({
      isFavorite: !!favorite,
      favoriteId: favorite?.id,
    });
  } catch (error) {
    console.error("Check favorite status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
