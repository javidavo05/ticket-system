/**
 * NFC Binding Flow
 * 
 * Orchestrates the 3-step binding process:
 * 1. Prepare - Get binding token from server
 * 2. Read - Read tag and detect state
 * 3. Write & Confirm - Write payload and confirm binding
 */

import { WebNFCService, type NFCReadResult } from './web-nfc'
import { NFCPayloadCodec, type NFCPayload } from './payload'
import {
  NFCError,
  NFCAbortError,
  NFCTagAlreadyBoundError,
  NFCTagInvalidError,
  NFCTokenExpiredError,
  NFCNetworkError,
} from './errors'

export interface BindingState {
  step: 'idle' | 'preparing' | 'ready' | 'reading' | 'writing' | 'confirming' | 'success' | 'error'
  error?: string
  bandUid?: string
  token?: string
  expiresAt?: number
  payload?: NFCPayload
  bandId?: string
  securityToken?: string
}

export interface TagReadResult {
  uid?: string
  payload?: NFCPayload
  state: 'unbound' | 'bound' | 'invalid' | 'expired'
}

export interface BindingCompleteResult {
  success: boolean
  bandId: string
  securityToken: string
}

/**
 * NFC Binding Flow
 * 
 * Manages the complete binding process from token preparation to confirmation.
 */
export class NFCBindingFlow {
  /**
   * Step 1: Prepare binding
   * 
   * Requests a short-lived binding token from the server.
   * 
   * @param userId - User ID to bind the tag to
   * @returns Binding token and expiration
   */
  static async prepareBinding(userId: string): Promise<{
    token: string
    expiresAt: number
    expiresIn: number
  }> {
    try {
      const response = await fetch('/api/nfc/bind/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autenticado. Inicia sesión primero.')
        }
        if (response.status >= 500) {
          throw new NFCNetworkError('Error del servidor. Intenta nuevamente.')
        }
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Error al preparar vinculación')
      }

      const data = await response.json()
      return {
        token: data.token,
        expiresAt: data.expiresAt,
        expiresIn: data.expiresIn,
      }
    } catch (error: any) {
      if (error instanceof NFCError) {
        throw error
      }
      if (error.message?.includes('fetch')) {
        throw new NFCNetworkError('Sin conexión. Verifica tu internet.')
      }
      throw new Error(error.message || 'Error al preparar vinculación')
    }
  }

  /**
   * Step 2: Read tag and detect state
   * 
   * Reads the NFC tag and determines its binding state.
   * 
   * @returns Tag read result with UID, payload, and state
   * @throws NFCAbortError if user cancels
   */
  static async readTag(): Promise<TagReadResult> {
    // Read tag using Web NFC
    let readResult: NFCReadResult
    try {
      readResult = await WebNFCService.readTag()
    } catch (error: any) {
      // Re-throw NFC errors as-is
      if (error instanceof NFCError) {
        throw error
      }
      // Wrap other errors
      throw new Error(error.message || 'Error al leer la pulsera')
    }

    const result: TagReadResult = {
      uid: readResult.uid,
      state: 'unbound',
    }

    // If no records, tag is unbound
    if (readResult.records.length === 0) {
      return result
    }

    // Try to decode payload
    try {
      const message = {
        records: readResult.records,
      }
      const payload = NFCPayloadCodec.decode(message)
      result.payload = payload

      // Verify signature
      const isValid = await NFCPayloadCodec.verify(payload)
      if (!isValid) {
        result.state = 'invalid'
        return result
      }

      // Check expiration
      if (NFCPayloadCodec.isExpired(payload)) {
        result.state = 'expired'
        return result
      }

      // Check if bound
      if (NFCPayloadCodec.isBound(payload)) {
        result.state = 'bound'
        return result
      }

      // Valid but unbound
      result.state = 'unbound'
      return result
    } catch (error: any) {
      // If decoding fails, tag might have old format or be invalid
      // Check if it's our MIME type
      const hasOurMimeType = readResult.records.some(
        (r) => r.recordType === 'mime' && r.mediaType === 'application/vnd.tickets.nfc'
      )

      if (hasOurMimeType) {
        // Our format but invalid
        result.state = 'invalid'
      } else {
        // Different format, treat as unbound
        result.state = 'unbound'
      }

      return result
    }
  }

  /**
   * Step 3: Write payload and confirm binding
   * 
   * Writes the secure payload to the tag and confirms binding on the server.
   * 
   * @param token - Binding token from prepare step
   * @param bandUid - Optional band UID from read step
   * @returns Binding completion result
   */
  static async writeAndConfirm(
    token: string,
    bandUid?: string
  ): Promise<BindingCompleteResult> {
    // First, get signed payload from server
    // Server will generate the signature securely
    let signedPayload: NFCPayload
    try {
      const signResponse = await fetch('/api/nfc/bind/sign-payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          bandUid,
        }),
      })

      if (!signResponse.ok) {
        throw new Error('Error al generar payload firmado')
      }

      const signData = await signResponse.json()
      signedPayload = signData.payload
    } catch (error: any) {
      if (error.message?.includes('fetch')) {
        throw new NFCNetworkError('Sin conexión. Verifica tu internet.')
      }
      throw error
    }

    // Encode to NDEF
    const ndefMessage = NFCPayloadCodec.encode(signedPayload)

    // Write to tag
    try {
      await WebNFCService.writeTag({
        records: ndefMessage.records,
        overwrite: true,
      })
    } catch (error: any) {
      if (error instanceof NFCError) {
        throw error
      }
      throw new Error(`Error al escribir: ${error.message}`)
    }

    // Confirm binding on server
    try {
      const response = await fetch('/api/nfc/bind/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          bandUid,
          payloadSignature: signedPayload.signature,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No autenticado. Inicia sesión primero.')
        }
        if (response.status === 400) {
          const error = await response.json().catch(() => ({}))
          if (error.error?.includes('expired')) {
            throw new NFCTokenExpiredError()
          }
          if (error.error?.includes('already bound')) {
            throw new NFCTagAlreadyBoundError()
          }
          throw new Error(error.error || 'Error al confirmar vinculación')
        }
        if (response.status >= 500) {
          throw new NFCNetworkError('Error del servidor. Intenta nuevamente.')
        }
        throw new Error('Error al confirmar vinculación')
      }

      const data = await response.json()
      return {
        success: true,
        bandId: data.bandId,
        securityToken: data.securityToken,
      }
    } catch (error: any) {
      if (error instanceof NFCError) {
        throw error
      }
      if (error.message?.includes('fetch')) {
        throw new NFCNetworkError('Sin conexión. Verifica tu internet.')
      }
      throw error
    }
  }

  /**
   * Complete binding flow (all 3 steps)
   * 
   * @param userId - User ID to bind to
   * @returns Complete binding result
   */
  static async completeFlow(userId: string): Promise<BindingCompleteResult> {
    // Step 1: Prepare
    const { token, expiresAt } = await this.prepareBinding(userId)

    // Step 2: Read
    const readResult = await this.readTag()

    // Check if already bound
    if (readResult.state === 'bound') {
      throw new NFCTagAlreadyBoundError()
    }

    // Check if invalid
    if (readResult.state === 'invalid') {
      throw new NFCTagInvalidError('La pulsera contiene datos inválidos')
    }

    // Step 3: Write & Confirm
    return await this.writeAndConfirm(token, readResult.uid)
  }
}
