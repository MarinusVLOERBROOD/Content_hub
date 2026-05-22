/**
 * High-level file operations — delegates to the active StorageProvider.
 * All callers go through these functions so switching cloud backends
 * only requires changing the provider configuration.
 */
import { getStorageProvider } from "./storage";

/** Sanitize a filename: keep alphanumeric, dots, hyphens, spaces, underscores. */
function safeName(originalName: string): string {
  return originalName.replace(/[^a-zA-Z0-9._\-\s]/g, "_");
}

/**
 * Save an uploaded file.
 * @returns the relativePath used (e.g. "Content/Foto/2026/photo.jpg")
 */
export async function saveUploadedFile(
  clientSlug: string,
  folderPath: string,
  originalName: string,
  buffer: Buffer,
  mimeType = "application/octet-stream"
): Promise<string> {
  const fileName = safeName(originalName);
  const relativePath = folderPath ? `${folderPath}/${fileName}` : fileName;
  const provider = await getStorageProvider();
  await provider.saveFile(clientSlug, relativePath, buffer, mimeType);
  return relativePath;
}

export async function deleteFile(
  clientSlug: string,
  relativePath: string
): Promise<void> {
  const provider = await getStorageProvider();
  await provider.deleteFile(clientSlug, relativePath);
}

export async function moveFile(
  clientSlug: string,
  oldRelativePath: string,
  newRelativePath: string
): Promise<void> {
  const provider = await getStorageProvider();
  await provider.moveFile(clientSlug, oldRelativePath, newRelativePath);
}

export async function fileExists(
  clientSlug: string,
  relativePath: string
): Promise<boolean> {
  const provider = await getStorageProvider();
  return provider.fileExists(clientSlug, relativePath);
}
