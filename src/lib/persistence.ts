import { db, DBImage } from './db';
import { ImageFile, ImageMetadata, EditVersion } from '@/types/image';

// ─── Serialisation helpers ──────────────────────────────────────

function imageToDBImage(img: ImageFile): DBImage {
  return {
    id: img.id,
    filename: img.filename,
    originalFilename: img.originalFilename,
    format: img.format,
    mimeType: img.mimeType,
    size: img.size,
    width: img.width,
    height: img.height,
    metadata: img.metadata ? JSON.stringify(img.metadata) : null,
    status: img.status,
    editHistory: img.editHistory ? JSON.stringify(img.editHistory) : null,
    currentVersionIndex: img.currentVersionIndex ?? -1,
    createdAt: Date.now(),
  };
}

function dbImageToImageFile(row: DBImage, blobUrls: Map<string, string>): ImageFile {
  const thumbUrl = blobUrls.get(`thumb_${row.id}`);
  return {
    id: row.id,
    filename: row.filename,
    originalFilename: row.originalFilename,
    format: row.format as ImageFile['format'],
    mimeType: row.mimeType,
    size: row.size,
    width: row.width,
    height: row.height,
    thumbnailUrl: thumbUrl,
    metadata: row.metadata ? JSON.parse(row.metadata) as ImageMetadata : null,
    status: row.status as ImageFile['status'],
    editHistory: row.editHistory ? JSON.parse(row.editHistory) as EditVersion[] : undefined,
    currentVersionIndex: row.currentVersionIndex >= 0 ? row.currentVersionIndex : undefined,
  };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Load all images and blob URLs from IndexedDB.
 * Returns hydrated ImageFile[] ready for Zustand.
 */
export async function hydrateFromDB(): Promise<{
  images: ImageFile[];
  sessionId: string | null;
  activeImageId: string | null;
}> {
  const [dbImages, session] = await Promise.all([
    db.images.orderBy('createdAt').toArray(),
    db.session.get('current'),
  ]);

  if (dbImages.length === 0) {
    return {
      images: [],
      sessionId: session?.sessionId ?? null,
      activeImageId: null,
    };
  }

  // Load thumbnail blobs for all images and create object URLs
  const thumbBlobs = await db.blobs
    .where('type')
    .equals('thumbnail')
    .toArray();

  const blobUrls = new Map<string, string>();
  for (const tb of thumbBlobs) {
    blobUrls.set(`thumb_${tb.parentId ?? tb.id}`, URL.createObjectURL(tb.blob));
  }

  // Also create object URLs for version thumbnails/images
  const versionBlobs = await db.blobs
    .where('type')
    .equals('version')
    .toArray();
  for (const vb of versionBlobs) {
    blobUrls.set(vb.id, URL.createObjectURL(vb.blob));
  }

  const images = dbImages.map((row) => dbImageToImageFile(row, blobUrls));

  return {
    images,
    sessionId: session?.sessionId ?? null,
    activeImageId: session?.activeImageId ?? null,
  };
}

/**
 * Persist a single image (metadata + blobs) to IndexedDB.
 */
export async function persistImage(
  image: ImageFile,
  originalBlob?: Blob,
  thumbnailBlob?: Blob,
): Promise<void> {
  const dbImage = imageToDBImage(image);
  await db.images.put(dbImage);

  if (originalBlob) {
    await db.blobs.put({
      id: image.id,
      blob: originalBlob,
      type: 'original',
      parentId: image.id,
      createdAt: Date.now(),
    });
  }

  if (thumbnailBlob) {
    await db.blobs.put({
      id: `thumb_${image.id}`,
      blob: thumbnailBlob,
      type: 'thumbnail',
      parentId: image.id,
      createdAt: Date.now(),
    });
  }
}

/**
 * Persist an edit version's blob and update image record.
 */
export async function persistEditVersion(
  imageId: string,
  version: EditVersion,
  versionBlob: Blob,
  thumbnailBlob?: Blob,
): Promise<void> {
  // Save version blob
  await db.blobs.put({
    id: version.id,
    blob: versionBlob,
    type: 'version',
    parentId: imageId,
    createdAt: Date.now(),
  });

  if (thumbnailBlob) {
    await db.blobs.put({
      id: `thumb_${version.id}`,
      blob: thumbnailBlob,
      type: 'thumbnail',
      parentId: imageId,
      createdAt: Date.now(),
    });
  }

  // Update image's editHistory in DB
  const existing = await db.images.get(imageId);
  if (existing) {
    const history: EditVersion[] = existing.editHistory
      ? JSON.parse(existing.editHistory)
      : [];
    history.push(version);
    await db.images.update(imageId, {
      editHistory: JSON.stringify(history),
      currentVersionIndex: history.length - 1,
    });
  }
}

/**
 * Update just the image metadata record (no blobs).
 */
export async function persistImageMetadata(
  imageId: string,
  updates: Partial<DBImage>,
): Promise<void> {
  await db.images.update(imageId, updates);
}

/**
 * Delete an image and all associated blobs.
 */
export async function deletePersistedImage(imageId: string): Promise<void> {
  await db.transaction('rw', db.images, db.blobs, db.actions, async () => {
    await db.images.delete(imageId);
    await db.blobs.where('parentId').equals(imageId).delete();
    await db.actions.where('imageId').equals(imageId).delete();
  });
}

/**
 * Save session state (last active image, route, etc.)
 */
export async function persistSession(data: {
  sessionId: string;
  activeImageId?: string | null;
  lastRoute?: string;
}): Promise<void> {
  await db.session.put({
    key: 'current',
    sessionId: data.sessionId,
    activeImageId: data.activeImageId ?? null,
    lastRoute: data.lastRoute ?? '/',
    updatedAt: Date.now(),
  });
}

/**
 * Get a blob URL for a specific image or version.
 */
export async function getBlobUrl(blobId: string): Promise<string | null> {
  const record = await db.blobs.get(blobId);
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}

/**
 * Clear all persisted data.
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.images, db.blobs, db.actions, db.session, async () => {
    await db.images.clear();
    await db.blobs.clear();
    await db.actions.clear();
    await db.session.clear();
  });
}
