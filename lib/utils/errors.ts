export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class PaymentError extends AppError {
  constructor(message: string, public provider?: string) {
    super(message, 402, 'PAYMENT_ERROR')
    this.name = 'PaymentError'
  }
}

export class ProfileUpdateError extends AppError {
  constructor(message: string) {
    super(message, 400, 'PROFILE_UPDATE_ERROR')
    this.name = 'ProfileUpdateError'
  }
}

export class TicketAccessError extends AppError {
  constructor(message: string) {
    super(message, 403, 'TICKET_ACCESS_ERROR')
    this.name = 'TicketAccessError'
  }
}

export class PasswordChangeError extends AppError {
  constructor(message: string) {
    super(message, 400, 'PASSWORD_CHANGE_ERROR')
    this.name = 'PasswordChangeError'
  }
}

