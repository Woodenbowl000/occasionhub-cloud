import { Request, Response } from "express";
import prisma from "../lib/prisma";



// Submit vendor application
export const submitVendorApplication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      businessName,
      businessType,
      description,
      phone,
      website,
      proofUrl,
      yearsOfExperience,
    } = req.body;

    // Check if user already has an application
    const existingApplication = await prisma.vendorApplication.findUnique({
      where: { userId },
    });

    if (existingApplication) {
      if (existingApplication.status === "Pending") {
        return res.status(400).json({
          message: "You already have a pending application",
        });
      }
      if (existingApplication.status === "Approved") {
        return res.status(400).json({
          message: "You are already a vendor",
        });
      }
    }

    // Create or update application
    const application = await prisma.vendorApplication.upsert({
      where: { userId },
      update: {
        businessName,
        businessType,
        description,
        phone,
        website,
        proofUrl,
        yearsOfExperience: parseInt(yearsOfExperience),
        status: "Pending",
        rejectionReason: null,
      },
      create: {
        userId,
        businessName,
        businessType,
        description,
        phone,
        website,
        proofUrl,
        yearsOfExperience: parseInt(yearsOfExperience),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (error: any) {
    console.error("Error submitting vendor application:", error);
    res.status(500).json({ message: "Failed to submit application" });
  }
};

// Get user's vendor application
export const getMyApplication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const application = await prisma.vendorApplication.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(application);
  } catch (error: any) {
    console.error("Error fetching application:", error);
    res.status(500).json({ message: "Failed to fetch application" });
  }
};

// Get all vendor applications (admin only)
export const getAllApplications = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const applications = await prisma.vendorApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(applications);
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
};

// Approve vendor application (admin only)
export const approveApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).userId;

    const application = await prisma.vendorApplication.findUnique({
      where: { id: parseInt(id) },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending applications can be approved",
      });
    }

    // Update application status
    await prisma.vendorApplication.update({
      where: { id: parseInt(id) },
      data: {
        status: "Approved",
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    // Update user isVendor flag in database
    const updatedUser = await prisma.user.update({
      where: { id: application.userId },
      data: {
        isVendor: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isVendor: true,
      },
    });

    res.json({
      message: "Application approved successfully. User now has vendor access.",
      userId: updatedUser.id,
      role: updatedUser.role,
      isVendor: updatedUser.isVendor,
    });
  } catch (error: any) {
    console.error("Error approving application:", error);
    res.status(500).json({ message: "Failed to approve application" });
  }
};

// Reject vendor application (admin only)
export const rejectApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).userId;

    const application = await prisma.vendorApplication.findUnique({
      where: { id: parseInt(id) },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending applications can be rejected",
      });
    }

    await prisma.vendorApplication.update({
      where: { id: parseInt(id) },
      data: {
        status: "Rejected",
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    res.json({ message: "Application rejected successfully" });
  } catch (error: any) {
    console.error("Error rejecting application:", error);
    res.status(500).json({ message: "Failed to reject application" });
  }
};
