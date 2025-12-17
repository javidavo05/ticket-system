/**
 * NFC Payload Codec
 * 
 * Encodes and decodes secure payloads for NFC tags.
 * Designed for NTAG213 tags (137 bytes total, ~100 bytes usable).
 * 
 * Payload format (70 bytes):
 * - Version (1 byte)
 * - Flags (1 byte)
 * - Token (32 bytes)
 * - Expiration (4 bytes, uint32)
 * - Signature (32 bytes, HMAC-SHA256)
 */

import type { NDEFMessage, NDEFRecord } from './types'

export interface NFCPayload {
  version: number
  flags: number
  token: string
  expiresAt: number
  signature: string
}

// Protocol version
const PAYLOAD_VERSION = 0x01

// Flag bits
const FLAG_BOUND = 0x01
const FLAG_EXPIRED = 0x02

// Payload structure offsets
const OFFSET_VERSION = 0
const OFFSET_FLAGS = 1
const OFFSET_TOKEN = 2
const OFFSET_EXPIRATION = 34
const OFFSET_SIGNATURE = 38
const PAYLOAD_SIZE = 70

/**
 * NFC Payload Codec
 * 
 * Handles encoding and decoding of secure NFC payloads.
 */
export class NFCPayloadCodec {
  /**
   * Get server secret for HMAC signing
   * This should match the server-side secret
   * 
   * Note: In production, this should be the same secret used on the server.
   * For client-side signing, we need a public key or the server should sign.
   * For now, we'll generate signature on server side via API.
   */
  private static getSigningSecret(): string {
    // Client-side signing is not secure - signatures should be generated server-side
    // This is a placeholder. In production, call server API to generate signature.
    const secret = process.env.NEXT_PUBLIC_NFC_SIGNING_SECRET || 
                   'default-secret-change-in-production'
    return secret
  }

  /**
   * Encode payload to NDEF message
   * 
   * @param payload - Payload to encode
   * @returns NDEF message ready to write
   */
  static encode(payload: NFCPayload): NDEFMessage {
    // Create binary payload
    const buffer = new ArrayBuffer(PAYLOAD_SIZE)
    const view = new DataView(buffer)

    // Write version
    view.setUint8(OFFSET_VERSION, payload.version)

    // Write flags
    view.setUint8(OFFSET_FLAGS, payload.flags)

    // Write token (32 bytes, base64 decode first)
    const tokenBytes = this.base64ToBytes(payload.token)
    if (tokenBytes.length !== 32) {
      throw new Error('Token must be exactly 32 bytes')
    }
    for (let i = 0; i < 32; i++) {
      view.setUint8(OFFSET_TOKEN + i, tokenBytes[i])
    }

    // Write expiration (4 bytes, uint32)
    view.setUint32(OFFSET_EXPIRATION, payload.expiresAt, false) // big-endian

    // Write signature (32 bytes)
    const signatureBytes = this.hexToBytes(payload.signature)
    if (signatureBytes.length !== 32) {
      throw new Error('Signature must be exactly 32 bytes')
    }
    for (let i = 0; i < 32; i++) {
      view.setUint8(OFFSET_SIGNATURE + i, signatureBytes[i])
    }

    // Create NDEF record
    const record: NDEFRecord = {
      recordType: 'mime',
      mediaType: 'application/vnd.tickets.nfc',
      data: buffer,
    }

    return {
      records: [record],
    }
  }

  /**
   * Decode NDEF message to payload
   * 
   * @param message - NDEF message to decode
   * @returns Decoded payload
   */
  static decode(message: NDEFMessage): NFCPayload {
    if (message.records.length === 0) {
      throw new Error('No records in NDEF message')
    }

    // Find our custom MIME type record
    const record = message.records.find(
      (r) => r.recordType === 'mime' && r.mediaType === 'application/vnd.tickets.nfc'
    )

    if (!record || !record.data) {
      throw new Error('Invalid NDEF record format')
    }

    // Convert string to ArrayBuffer if necessary
    const dataBuffer = typeof record.data === 'string' 
      ? new TextEncoder().encode(record.data).buffer 
      : record.data

    const data = new Uint8Array(dataBuffer)
    if (data.length < PAYLOAD_SIZE) {
      throw new Error(`Payload too small: ${data.length} bytes, expected ${PAYLOAD_SIZE}`)
    }

    const view = new DataView(dataBuffer)

    // Read version
    const version = view.getUint8(OFFSET_VERSION)

    // Read flags
    const flags = view.getUint8(OFFSET_FLAGS)

    // Read token (32 bytes)
    const tokenBytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      tokenBytes[i] = view.getUint8(OFFSET_TOKEN + i)
    }
    const token = this.bytesToBase64(tokenBytes)

    // Read expiration (4 bytes, uint32)
    const expiresAt = view.getUint32(OFFSET_EXPIRATION, false) // big-endian

    // Read signature (32 bytes)
    const signatureBytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      signatureBytes[i] = view.getUint8(OFFSET_SIGNATURE + i)
    }
    const signature = this.bytesToHex(signatureBytes)

    return {
      version,
      flags,
      token,
      expiresAt,
      signature,
    }
  }

  /**
   * Generate signature for payload
   * 
   * @param payload - Payload to sign (without signature)
   * @returns HMAC-SHA256 signature as hex string
   */
  static async generateSignature(payload: Omit<NFCPayload, 'signature'>): Promise<string> {
    const secret = this.getSigningSecret()
    const encoder = new TextEncoder()

    // Create data to sign: version + flags + token + expiration
    const buffer = new ArrayBuffer(38) // 1 + 1 + 32 + 4
    const view = new DataView(buffer)

    view.setUint8(0, payload.version)
    view.setUint8(1, payload.flags)

    const tokenBytes = this.base64ToBytes(payload.token)
    for (let i = 0; i < 32; i++) {
      view.setUint8(2 + i, tokenBytes[i])
    }

    view.setUint32(34, payload.expiresAt, false)

    // Generate HMAC-SHA256
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, buffer)
    return this.bytesToHex(new Uint8Array(signature))
  }

  /**
   * Verify payload signature
   * 
   * Note: For client-side verification, we should call server API.
   * This method uses a client-side secret which may not match server.
   * 
   * @param payload - Payload to verify
   * @returns True if signature is valid
   */
  static async verify(payload: NFCPayload): Promise<boolean> {
    try {
      // For client-side, verify via server API for security
      // Server has the correct secret
      const response = await fetch('/api/nfc/verify-payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.valid === true
    } catch (error) {
      console.error('Signature verification error:', error)
      // Fallback to local verification (less secure)
      try {
        const payloadWithoutSig: Omit<NFCPayload, 'signature'> = {
          version: payload.version,
          flags: payload.flags,
          token: payload.token,
          expiresAt: payload.expiresAt,
        }
        const expectedSignature = await this.generateSignature(payloadWithoutSig)
        return this.constantTimeEquals(payload.signature, expectedSignature)
      } catch {
        return false
      }
    }
  }

  /**
   * Check if payload is expired
   * 
   * @param payload - Payload to check
   * @returns True if expired
   */
  static isExpired(payload: NFCPayload): boolean {
    const now = Math.floor(Date.now() / 1000)
    return payload.expiresAt < now
  }

  /**
   * Check if payload is bound
   * 
   * @param payload - Payload to check
   * @returns True if bound
   */
  static isBound(payload: NFCPayload): boolean {
    return (payload.flags & FLAG_BOUND) !== 0
  }

  /**
   * Check if payload is marked as expired
   * 
   * @param payload - Payload to check
   * @returns True if marked as expired
   */
  static isMarkedExpired(payload: NFCPayload): boolean {
    return (payload.flags & FLAG_EXPIRED) !== 0
  }

  /**
   * Create payload with bound flag set
   * 
   * @param payload - Base payload
   * @returns Payload with bound flag
   */
  static setBound(payload: NFCPayload): NFCPayload {
    return {
      ...payload,
      flags: payload.flags | FLAG_BOUND,
    }
  }

  /**
   * Create payload with expired flag set
   * 
   * @param payload - Base payload
   * @returns Payload with expired flag
   */
  static setExpired(payload: NFCPayload): NFCPayload {
    return {
      ...payload,
      flags: payload.flags | FLAG_EXPIRED,
    }
  }

  // Utility functions

  private static base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  private static bytesToBase64(bytes: Uint8Array): string {
    const binary = String.fromCharCode(...bytes)
    return btoa(binary)
  }

  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
  }

  private static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}
