import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";
import type { Request, Response } from "express";
import { put } from "@vercel/blob";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const uniqueName = (file: Express.Multer.File) => {
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${file.fieldname}-${suffix}${path.extname(file.originalname).toLowerCase()}`;
};

// Only names produced by uniqueName() are ever served (blocks path traversal).
const SAFE_NAME = /^[A-Za-z0-9_-]+-\d+-\d+\.(jpe?g|png|gif|webp)$/;

const S3_BUCKET = process.env.S3_BUCKET;
let s3: S3Client | undefined;
// Region and credentials come from the EC2 instance role (no keys in code).
const s3Client = () => (s3 ??= new S3Client({}));

/**
 * Stores uploaded venue photos and returns their public URLs.
 * - S3_BUCKET set (AWS): uploads to a PRIVATE S3 bucket. Photos are served
 *   back through this API (see serveVenuePhoto), so the bucket never needs
 *   public access and app instances stay stateless.
 * - BLOB_READ_WRITE_TOKEN set (Vercel): uploads to Vercel Blob.
 * - Otherwise (local dev): writes to ./uploads/venues, served by Express.
 */
export const saveVenuePhotos = async (
  files: Express.Multer.File[] | undefined,
  publicBaseUrl: string
): Promise<string[]> => {
  if (!files || files.length === 0) return [];

  if (S3_BUCKET) {
    return Promise.all(
      files.map(async (file) => {
        const name = uniqueName(file);
        await s3Client().send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `venues/${name}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            // File names are unique, so the content never changes
            CacheControl: "public, max-age=31536000, immutable",
          })
        );
        return `${publicBaseUrl}/uploads/venues/${name}`;
      })
    );
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return Promise.all(
      files.map(async (file) => {
        const blob = await put(`venues/${uniqueName(file)}`, file.buffer, {
          access: "public",
          contentType: file.mimetype,
        });
        return blob.url;
      })
    );
  }

  const dir = path.join(process.cwd(), "uploads", "venues");
  await fs.mkdir(dir, { recursive: true });
  return Promise.all(
    files.map(async (file) => {
      const name = uniqueName(file);
      await fs.writeFile(path.join(dir, name), file.buffer);
      return `${publicBaseUrl}/uploads/venues/${name}`;
    })
  );
};

export const usingS3 = () => Boolean(S3_BUCKET);

/** GET /uploads/venues/:name — streams a photo from the private S3 bucket. */
export const serveVenuePhoto = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { name } = req.params;
  if (!SAFE_NAME.test(name)) {
    res.status(404).end();
    return;
  }
  try {
    const obj = await s3Client().send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: `venues/${name}` })
    );
    if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
    if (obj.ContentLength) res.setHeader("Content-Length", obj.ContentLength);
    if (obj.ETag) res.setHeader("ETag", obj.ETag);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    (obj.Body as Readable).pipe(res);
  } catch (error: any) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      res.status(404).end();
      return;
    }
    console.error("S3 photo read error:", error);
    res.status(502).end();
  }
};

/** Base URL of this API as seen by the caller (works behind a proxy). */
export const requestBaseUrl = (req: {
  protocol: string;
  get(name: string): string | undefined;
}) => process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`;
