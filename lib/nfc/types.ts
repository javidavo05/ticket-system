/**
 * Web NFC API Type Definitions
 * 
 * TypeScript definitions for Web NFC API (Chrome Android 89+)
 * Based on: https://w3c.github.io/web-nfc/
 */

export interface NDEFRecord {
  recordType: string
  mediaType?: string
  id?: string
  data?: ArrayBuffer | string
  encoding?: string
  lang?: string
}

export interface NDEFMessage {
  records: NDEFRecord[]
}

export interface NDEFReadingEvent extends Event {
  message: NDEFMessage
  serialNumber?: string
}

export interface NDEFReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>
  addEventListener(
    type: 'reading' | 'readingerror',
    listener: (event: NDEFReadingEvent | Event) => void
  ): void
  removeEventListener(
    type: 'reading' | 'readingerror',
    listener: (event: NDEFReadingEvent | Event) => void
  ): void
}

export interface NDEFWriter {
  write(
    message: NDEFMessage | NDEFRecord[],
    options?: { signal?: AbortSignal; overwrite?: boolean }
  ): Promise<void>
}

// Extend Window interface
declare global {
  interface Window {
    NDEFReader?: {
      new (): NDEFReader
    }
    NDEFWriter?: {
      new (): NDEFWriter
    }
  }
}
