/**
 * RSA decryption utilities for handling encrypted emails
 * The private key is stored securely in Cloudflare secrets
 */

export async function decryptEmail(encryptedBase64: string, privateKeyPem: string): Promise<string> {
  try {
    // Check if this looks like an encrypted email (long base64 string)
    if (encryptedBase64.length < 100 || !/^[A-Za-z0-9+/=]+$/.test(encryptedBase64)) {
      // Not encrypted, return as is
      return encryptedBase64;
    }

    // Convert base64 to ArrayBuffer
    const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Import the private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(privateKeyPem),
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedData
    );

    // Convert ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.warn('Email decryption failed, likely not encrypted or wrong key:', error);
    // Return original value if decryption fails (might not be encrypted)
    return encryptedBase64;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM headers/footers and whitespace
  const base64 = pem
    .replace(/-----BEGIN.*?-----/g, '')
    .replace(/-----END.*?-----/g, '')
    .replace(/\s/g, '');
  
  // Convert base64 to binary
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}