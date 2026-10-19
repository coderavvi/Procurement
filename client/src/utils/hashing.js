import { keccak256 } from "ethers";

/**
 * Computes Keccak-256 cryptographic hash of a File or Blob in the browser
 * before any data is transmitted over the network.
 * @param {File|Blob} file - The file to hash
 * @returns {Promise<{ hash: string, size: number, name: string, type: string }>}
 */
export async function hashFileClientSide(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        const hash = keccak256(uint8Array);
        resolve({
          hash,
          size: file.size,
          name: file.name,
          type: file.type || "application/octet-stream",
          arrayBuffer,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Computes Keccak-256 of plain text string
 * @param {string} text 
 * @returns {string}
 */
export function hashString(text) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return keccak256(bytes);
}
