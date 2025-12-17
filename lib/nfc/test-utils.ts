/**
 * Test Utilities for Web NFC
 * 
 * Provides mocks and utilities for testing NFC functionality
 * without requiring actual NFC hardware.
 */

import { type NFCReadResult } from './web-nfc'
import { type NFCPayload } from './payload'
import { NFCPayloadCodec } from './payload'

/**
 * Mock Web NFC API for testing
 */
export class MockWebNFC {
  private static mockTag: NFCPayload | null = null
  private static mockUid: string | null = null

  /**
   * Set mock tag data
   */
  static setMockTag(payload: NFCPayload | null, uid?: string): void {
    this.mockTag = payload
    this.mockUid = uid || null
  }

  /**
   * Simulate reading a tag
   */
  static async mockRead(): Promise<NFCReadResult> {
    if (!this.mockTag) {
      return {
        uid: this.mockUid || undefined,
        records: [],
      }
    }

    // Encode payload to NDEF
    const message = NFCPayloadCodec.encode(this.mockTag)

    return {
      uid: this.mockUid || undefined,
      records: message.records,
    }
  }

  /**
   * Simulate writing to a tag
   */
  static async mockWrite(records: NDEFRecord[]): Promise<void> {
    try {
      // Decode to verify it's valid
      const message = { records }
      const payload = NFCPayloadCodec.decode(message)
      
      // Store as mock tag
      this.mockTag = payload
    } catch (error) {
      throw new Error(`Invalid payload: ${error}`)
    }
  }

  /**
   * Clear mock tag
   */
  static clearMockTag(): void {
    this.mockTag = null
    this.mockUid = null
  }
}

/**
 * Create test payload
 */
export function createTestPayload(overrides?: Partial<NFCPayload>): NFCPayload {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + 5 * 60 // 5 minutes

  return {
    version: 0x01,
    flags: 0x00,
    token: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),
    expiresAt,
    signature: '0'.repeat(64), // Placeholder, will be signed properly
    ...overrides,
  }
}

/**
 * Test helper to verify payload encoding/decoding
 */
export async function testPayloadRoundTrip(payload: NFCPayload): Promise<boolean> {
  try {
    // Encode
    const message = NFCPayloadCodec.encode(payload)
    
    // Decode
    const decoded = NFCPayloadCodec.decode(message)
    
    // Compare (excluding signature - that's verified separately)
    return (
      decoded.version === payload.version &&
      decoded.flags === payload.flags &&
      decoded.token === payload.token &&
      decoded.expiresAt === payload.expiresAt
    )
  } catch (error) {
    console.error('Payload round-trip test failed:', error)
    return false
  }
}
