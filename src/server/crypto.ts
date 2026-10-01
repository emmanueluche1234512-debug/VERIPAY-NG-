import crypto from 'crypto';

/**
 * Veripay NG — Server-Side OAuth Token Encryption Utility
 *
 * SECURITY INVARIANTS:
 * 1. Server-Only execution: Never bundle or import this file in client-side code.
 * 2. Authenticated Encryption: Uses AES-256-GCM with a unique 12-byte random IV
 *    and a 16-byte authentication tag per encryption operation.
 * 3. Secret Key Protection: Key is read strictly from `process.env.GMAIL_TOKEN_ENCRYPTION_KEY`.
 *    Never hard-code keys. Never log or leak keys or plaintext tokens.
 * 4. Safe Failure: Throws immediately if the encryption key is missing or invalid,
 *    preventing any plaintext OAuth token storage.
 */

const CIPHER_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KDF_SALT = 'veripay_gmail_oauth_token_kdf_salt_v1';

/**
 * Resolves a 256-bit (32-byte) cryptographic key from GMAIL_TOKEN_ENCRYPTION_KEY.
 * Accepts:
 * - 64-character hexadecimal string
 * - 32-byte base64 string
 * - Any high-entropy string (derived to 32 bytes via scrypt)
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

  if (!secret || !secret.trim()) {
    throw new Error(
      'Missing required server environment variable: GMAIL_TOKEN_ENCRYPTION_KEY. ' +
        'OAuth tokens cannot be encrypted or stored without this server-side key.'
    );
  }

  const trimmed = secret.trim();

  // If 64 hex characters (32 raw bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // If 32-byte base64 (44 chars ending in '=' or 43 without padding)
  if (/^[A-Za-z0-9+/]{43,44}={0,2}$/.test(trimmed)) {
    try {
      const decoded = Buffer.from(trimmed, 'base64');
      if (decoded.length === 32) {
        return decoded;
      }
    } catch {
      // Fall through to scrypt derivation
    }
  }

  // Derive a deterministic 32-byte key using scrypt
  return crypto.scryptSync(trimmed, KDF_SALT, 32);
}

/**
 * Encrypts a sensitive OAuth token using AES-256-GCM.
 * Output format: `enc_v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty token payload.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);

  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return `enc_v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 * Validates integrity via the GCM authentication tag.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) {
    throw new Error('Cannot decrypt empty ciphertext.');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 4 || parts[0] !== 'enc_v1') {
    throw new Error('Invalid or unsupported encrypted token format.');
  }

  const [, ivHex, tagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}
