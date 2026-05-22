/**
 * AES-256-GCM credential encryption.
 * Key is derived from SESSION_SECRET via scrypt so the raw secret
 * never touches the cipher directly.
 */
import crypto from "crypto";

function deriveKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  // scrypt: deterministic 32-byte key from the secret + a fixed salt
  return crypto.scryptSync(secret, "content-hub-storage-v1", 32);
}

/**
 * Encrypt a string. Returns a base64 string:
 *   [12-byte IV][16-byte auth-tag][ciphertext]
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16 bytes
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypt a base64 string produced by `encrypt`.
 * Throws if the ciphertext is tampered or the key is wrong.
 */
export function decrypt(encoded: string): string {
  const key = deriveKey();
  const buf = Buffer.from(encoded, "base64");
  if (buf.length < 28) throw new Error("Invalid ciphertext");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return (
    decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8")
  );
}
