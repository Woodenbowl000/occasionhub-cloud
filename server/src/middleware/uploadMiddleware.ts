import multer from "multer";
import path from "path";

// Files are kept in memory and handed to utils/storage, which writes them to
// Vercel Blob in production (serverless disks are read-only/ephemeral) or to
// the local uploads/ folder in development.
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    // Vercel functions accept request bodies up to 4.5MB in total
    fileSize: 4 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

export { upload };
