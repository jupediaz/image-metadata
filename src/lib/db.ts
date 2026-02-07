import Dexie, { type EntityTable } from 'dexie';

// ─── Stored types ───────────────────────────────────────────────

export interface DBImage {
  id: string;                     // same id used in ImageFile
  filename: string;
  originalFilename: string;
  format: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  metadata: string | null;        // JSON-serialised ImageMetadata
  status: string;
  editHistory: string | null;     // JSON-serialised EditVersion[]
  currentVersionIndex: number;
  createdAt: number;              // epoch ms
}

export interface DBBlob {
  id: string;                     // imageId or versionId
  blob: Blob;
  type: 'original' | 'thumbnail' | 'version' | 'mask';
  parentId?: string;              // imageId this blob belongs to
  createdAt: number;
}

export interface DBEditAction {
  id?: number;                    // auto-increment
  imageId: string;
  type: 'ai-edit' | 'mask-draw' | 'revert';
  prompt?: string;
  model?: string;
  beforeBlobId?: string;          // reference to DBBlob
  afterBlobId?: string;
  maskBlobId?: string;
  timestamp: number;
}

export interface DBSession {
  key: string;                    // singleton 'current'
  sessionId: string;
  activeImageId: string | null;
  lastRoute: string;              // last visited URL path
  updatedAt: number;
}

// ─── Database ───────────────────────────────────────────────────

class ImageMetadataDB extends Dexie {
  images!: EntityTable<DBImage, 'id'>;
  blobs!: EntityTable<DBBlob, 'id'>;
  actions!: EntityTable<DBEditAction, 'id'>;
  session!: EntityTable<DBSession, 'key'>;

  constructor() {
    super('image-metadata-db');

    this.version(1).stores({
      images: 'id, createdAt',
      blobs: 'id, parentId, type',
      actions: '++id, imageId, timestamp',
      session: 'key',
    });
  }
}

export const db = new ImageMetadataDB();
