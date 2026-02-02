import { mkdir, rm, readdir, rename, readFile, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const TMP_DIR = path.join(process.cwd(), 'tmp', 'sessions');

export function getSessionDir(sessionId: string): string {
  const sanitized = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
  return path.join(TMP_DIR, sanitized);
}

export function getFilePath(sessionId: string, fileId: string, ext: string): string {
  return path.join(getSessionDir(sessionId), `${fileId}${ext}`);
}

export function getThumbnailPath(sessionId: string, fileId: string): string {
  return path.join(getSessionDir(sessionId), `${fileId}_thumb.jpg`);
}

export async function ensureSessionDir(sessionId: string): Promise<string> {
  const dir = getSessionDir(sessionId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFile(sessionId: string, fileId: string, ext: string, buffer: Buffer): Promise<string> {
  await ensureSessionDir(sessionId);
  const filePath = getFilePath(sessionId, fileId, ext);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function getFile(sessionId: string, fileId: string, ext: string): Promise<Buffer> {
  const filePath = getFilePath(sessionId, fileId, ext);
  return readFile(filePath);
}

export async function saveThumbnail(sessionId: string, fileId: string, buffer: Buffer): Promise<string> {
  await ensureSessionDir(sessionId);
  const thumbPath = getThumbnailPath(sessionId, fileId);
  await writeFile(thumbPath, buffer);
  return thumbPath;
}

export async function renameFile(sessionId: string, oldId: string, oldExt: string, newName: string): Promise<void> {
  const oldPath = getFilePath(sessionId, oldId, oldExt);
  const newPath = path.join(getSessionDir(sessionId), newName);
  await rename(oldPath, newPath);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const dir = getSessionDir(sessionId);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function listSessionFiles(sessionId: string): Promise<string[]> {
  const dir = getSessionDir(sessionId);
  if (!existsSync(dir)) return [];
  return readdir(dir);
}

export async function getFileSize(filePath: string): Promise<number> {
  const s = await stat(filePath);
  return s.size;
}

export function formatToExt(format: string): string {
  const map: Record<string, string> = {
    jpeg: '.jpg',
    jpg: '.jpg',
    png: '.png',
    webp: '.webp',
    heic: '.heic',
    heif: '.heic',
    tiff: '.tiff',
  };
  return map[format.toLowerCase()] || `.${format}`;
}

export function extToFormat(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.png': 'png',
    '.webp': 'webp',
    '.heic': 'heic',
    '.heif': 'heic',
    '.tiff': 'tiff',
  };
  return map[ext.toLowerCase()] || ext.replace('.', '');
}
