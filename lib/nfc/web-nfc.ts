/**
 * Web NFC API Service
 * 
 * Provides abstraction over Web NFC API for reading and writing NFC tags.
 * Requires Chrome Android 89+ or Edge Android 89+.
 * 
 * All NFC operations require explicit user gesture (button click, etc.)
 */

import {
  NFCError,
  NFCNotSupportedError,
  NFCDisabledError,
  NFCNotAllowedError,
  NFCAbortError,
  NFCReadError,
  NFCWriteError,
} from './errors'
import type { NDEFReader, NDEFWriter, NDEFReadingEvent, NDEFRecord } from './types'

export interface NFCReadResult {
  uid?: string
  serialNumber?: string
  records: NDEFRecord[]
  rawData?: Uint8Array
}

export interface NFCWriteOptions {
  records: NDEFRecord[]
  overwrite?: boolean
}

/**
 * Web NFC Service
 * 
 * Provides methods for reading and writing NFC tags using Web NFC API.
 */
export class WebNFCService {
  private static reader: NDEFReader | null = null
  private static writer: NDEFWriter | null = null
  private static abortController: AbortController | null = null

  /**
   * Check if Web NFC is supported in the current browser
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    // Check for NDEFReader (read) and NDEFWriter (write) support
    return (
      'NDEFReader' in window &&
      'NDEFWriter' in window &&
      window.NDEFReader !== undefined &&
      window.NDEFWriter !== undefined
    )
  }

  /**
   * Check if device is Android (Web NFC is Android-only)
   */
  static isAndroid(): boolean {
    if (typeof navigator === 'undefined') {
      return false
    }
    return /Android/i.test(navigator.userAgent)
  }

  /**
   * Check if NFC is likely enabled
   * Note: Web NFC API doesn't provide a direct way to check if NFC is enabled,
   * so we can only detect after attempting to use it.
   */
  static async isEnabled(): Promise<boolean> {
    if (!this.isSupported()) {
      return false
    }

    // We can't actually check without attempting to read/write
    // This is a best-effort check
    return true
  }

  /**
   * Request NFC permission
   * Note: Web NFC permission is implicit (granted by user gesture)
   * This method is a placeholder for future permission APIs
   */
  static async requestPermission(): Promise<PermissionState> {
    if (!this.isSupported()) {
      throw new NFCNotSupportedError()
    }

    // Web NFC doesn't have a separate permission API
    // Permission is granted implicitly when user performs a gesture
    // For now, we'll assume 'prompt' state
    return 'prompt'
  }

  /**
   * Read NFC tag
   * 
   * Requires explicit user gesture (button click, etc.)
   * 
   * @returns Promise resolving to read result
   * @throws NFCError on failure
   */
  static async readTag(): Promise<NFCReadResult> {
    if (!this.isSupported()) {
      throw new NFCNotSupportedError()
    }

    if (!this.isAndroid()) {
      throw new NFCNotSupportedError()
    }

    try {
      // Create new reader instance
      if (!window.NDEFReader) {
        throw new NFCNotSupportedError()
      }
      const reader = new window.NDEFReader()
      this.reader = reader

      // Create abort controller for cancellation
      const abortController = new AbortController()
      this.abortController = abortController

      // Start scanning
      await reader.scan({ signal: abortController.signal })

      // Wait for tag to be detected
      return new Promise<NFCReadResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new NFCReadError('Tiempo de espera agotado. Acerca la pulsera al teléfono'))
        }, 30000) // 30 second timeout

        reader.addEventListener('reading', (event: NDEFReadingEvent) => {
          clearTimeout(timeout)
          
          try {
            const result: NFCReadResult = {
              records: event.message.records,
            }

            // Try to extract UID from serial number (if available)
            if (event.serialNumber) {
              result.uid = event.serialNumber
              result.serialNumber = event.serialNumber
            }

            // Extract raw data from records
            const rawDataArrays: Uint8Array[] = []
            for (const record of event.message.records) {
              if (record.data) {
                rawDataArrays.push(new Uint8Array(record.data))
              }
            }
            if (rawDataArrays.length > 0) {
              // Concatenate all record data
              const totalLength = rawDataArrays.reduce((sum, arr) => sum + arr.length, 0)
              const combined = new Uint8Array(totalLength)
              let offset = 0
              for (const arr of rawDataArrays) {
                combined.set(arr, offset)
                offset += arr.length
              }
              result.rawData = combined
            }

            resolve(result)
          } catch (error: any) {
            reject(new NFCReadError(error.message || 'Error al procesar datos de la pulsera'))
          }
        })

        reader.addEventListener('readingerror', (event: any) => {
          clearTimeout(timeout)
          const error = event.error

          if (error.name === 'NotAllowedError') {
            reject(new NFCNotAllowedError())
          } else if (error.name === 'NotReadableError') {
            reject(new NFCDisabledError())
          } else if (error.name === 'AbortError') {
            reject(new NFCAbortError())
          } else {
            reject(new NFCReadError(error.message || 'Error desconocido al leer'))
          }
        })
      })
    } catch (error: any) {
      if (error instanceof NFCError) {
        throw error
      }

      if (error.name === 'NotAllowedError') {
        throw new NFCNotAllowedError()
      } else if (error.name === 'NotSupportedError') {
        throw new NFCNotSupportedError()
      } else if (error.name === 'NotReadableError') {
        throw new NFCDisabledError()
      } else if (error.name === 'AbortError') {
        throw new NFCAbortError()
      } else {
        throw new NFCReadError(error.message || 'Error desconocido')
      }
    }
  }

  /**
   * Write NFC tag
   * 
   * Requires explicit user gesture (button click, etc.)
   * 
   * @param options - Write options including records to write
   * @throws NFCError on failure
   */
  static async writeTag(options: NFCWriteOptions): Promise<void> {
    if (!this.isSupported()) {
      throw new NFCNotSupportedError()
    }

    if (!this.isAndroid()) {
      throw new NFCNotSupportedError()
    }

    try {
      // Create new writer instance
      if (!window.NDEFWriter) {
        throw new NFCNotSupportedError()
      }
      const writer = new window.NDEFWriter()
      this.writer = writer

      // Create abort controller for cancellation
      const abortController = new AbortController()
      this.abortController = abortController

      // Write records to tag
      await writer.write(options.records, { signal: abortController.signal })
    } catch (error: any) {
      if (error instanceof NFCError) {
        throw error
      }

      if (error.name === 'NotAllowedError') {
        throw new NFCNotAllowedError()
      } else if (error.name === 'NotSupportedError') {
        throw new NFCNotSupportedError()
      } else if (error.name === 'NotReadableError' || error.name === 'NotWritableError') {
        throw new NFCDisabledError()
      } else if (error.name === 'AbortError') {
        throw new NFCAbortError()
      } else {
        throw new NFCWriteError(error.message || 'Error desconocido al escribir')
      }
    }
  }

  /**
   * Abort ongoing NFC operation
   */
  static abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // Clean up reader/writer
    this.reader = null
    this.writer = null
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    this.abort()
  }
}
