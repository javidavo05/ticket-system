import type { ThemeConfig } from './loader'
import type { ThemeTokenContract, ValidationResult, ValidationError, ValidationWarning } from './token-contract'

/**
 * Validate config against token contract
 */
export function validateAgainstContract(
  config: ThemeConfig,
  contract: ThemeTokenContract
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Validate required tokens
  const requiredResult = validateRequiredTokens(config, contract)
  errors.push(...requiredResult.errors)
  warnings.push(...requiredResult.warnings)

  // Validate token types
  const typeResult = validateTokenTypes(config, contract)
  errors.push(...typeResult.errors)
  warnings.push(...typeResult.warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate required tokens are present
 */
export function validateRequiredTokens(
  config: ThemeConfig,
  contract: ThemeTokenContract
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  for (const category of Object.values(contract.tokens)) {
    for (const token of category.required) {
      const value = getTokenValue(config, token.path)
      if (value === undefined || value === null) {
        errors.push({
          token: token.path,
          message: `Required token missing: ${token.path}`,
          expected: token.type,
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate token types match contract
 */
export function validateTokenTypes(
  config: ThemeConfig,
  contract: ThemeTokenContract
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  for (const [categoryName, category] of Object.entries(contract.tokens)) {
    for (const token of [...category.required, ...category.optional]) {
      const value = getTokenValue(config, token.path)
      if (value !== undefined && value !== null) {
        const typeValid = validateTokenType(value, token.type, token.validation)
        if (!typeValid.valid) {
          errors.push({
            token: token.path,
            message: typeValid.message || `Invalid type for ${token.path}`,
            expected: token.type,
            actual: typeof value,
          })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get token value from config
 */
function getTokenValue(config: ThemeConfig, path: string): unknown {
  const parts = path.split('.')
  let current: any = config

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return current
}

/**
 * Validate token type and constraints
 */
function validateTokenType(
  value: unknown,
  expectedType: string,
  validation: { pattern?: string; min?: number; max?: number; enum?: string[] }
): { valid: boolean; message?: string } {
  // Color validation
  if (expectedType === 'color' && typeof value === 'string') {
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return { valid: false, message: `Color value does not match pattern: ${validation.pattern}` }
    }
    return { valid: true }
  }

  // Size validation
  if (expectedType === 'size' && typeof value === 'string') {
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return { valid: false, message: `Size value does not match pattern: ${validation.pattern}` }
    }
    return { valid: true }
  }

  // String validation
  if (expectedType === 'string' && typeof value === 'string') {
    if (validation.max !== undefined && value.length > validation.max) {
      return { valid: false, message: `String exceeds max length: ${validation.max}` }
    }
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return { valid: false, message: `String does not match pattern: ${validation.pattern}` }
    }
    if (validation.enum && !validation.enum.includes(value)) {
      return { valid: false, message: `String must be one of: ${validation.enum.join(', ')}` }
    }
    return { valid: true }
  }

  // Number validation
  if (expectedType === 'number' && typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return { valid: false, message: `Number below minimum: ${validation.min}` }
    }
    if (validation.max !== undefined && value > validation.max) {
      return { valid: false, message: `Number above maximum: ${validation.max}` }
    }
    return { valid: true }
  }

  // Boolean validation
  if (expectedType === 'boolean' && typeof value === 'boolean') {
    return { valid: true }
  }

  // Array validation
  if (expectedType === 'array' && Array.isArray(value)) {
    return { valid: true }
  }

  // Object validation
  if (expectedType === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { valid: true }
  }

  return { valid: false, message: `Expected ${expectedType}, got ${typeof value}` }
}
