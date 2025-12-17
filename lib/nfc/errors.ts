/**
 * NFC-specific error types
 */

export class NFCError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message)
    this.name = 'NFCError'
  }
}

export class NFCNotSupportedError extends NFCError {
  constructor() {
    super(
      'NFC no está disponible en este dispositivo',
      'NOT_SUPPORTED',
      false
    )
    this.name = 'NFCNotSupportedError'
  }
}

export class NFCDisabledError extends NFCError {
  constructor() {
    super(
      'NFC está desactivado. Actívalo en configuración',
      'NFC_DISABLED',
      true
    )
    this.name = 'NFCDisabledError'
  }
}

export class NFCNotAllowedError extends NFCError {
  constructor() {
    super(
      'Se requiere un gesto del usuario para usar NFC',
      'NOT_ALLOWED',
      true
    )
    this.name = 'NFCNotAllowedError'
  }
}

export class NFCAbortError extends NFCError {
  constructor() {
    super(
      'Operación cancelada',
      'ABORTED',
      true
    )
    this.name = 'NFCAbortError'
  }
}

export class NFCReadError extends NFCError {
  constructor(message: string = 'Error al leer la pulsera NFC') {
    super(message, 'READ_ERROR', true)
    this.name = 'NFCReadError'
  }
}

export class NFCWriteError extends NFCError {
  constructor(message: string = 'Error al escribir en la pulsera NFC') {
    super(message, 'WRITE_ERROR', true)
    this.name = 'NFCWriteError'
  }
}

export class NFCTagAlreadyBoundError extends NFCError {
  constructor() {
    super(
      'Esta pulsera ya está vinculada a otro usuario',
      'ALREADY_BOUND',
      false
    )
    this.name = 'NFCTagAlreadyBoundError'
  }
}

export class NFCTagInvalidError extends NFCError {
  constructor(message: string = 'Pulsera inválida o corrupta') {
    super(message, 'INVALID_TAG', false)
    this.name = 'NFCTagInvalidError'
  }
}

export class NFCTokenExpiredError extends NFCError {
  constructor() {
    super(
      'El token de vinculación expiró. Intenta nuevamente',
      'TOKEN_EXPIRED',
      true
    )
    this.name = 'NFCTokenExpiredError'
  }
}

export class NFCNetworkError extends NFCError {
  constructor(message: string = 'Sin conexión. Verifica tu internet') {
    super(message, 'NETWORK_ERROR', true)
    this.name = 'NFCNetworkError'
  }
}
