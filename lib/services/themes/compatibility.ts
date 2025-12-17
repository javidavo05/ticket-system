import type { ThemeConfig } from './loader'
import type { ThemeTokenContract, DeprecatedToken, CompatibilityIssue } from './token-contract'
import { getTokenContract } from './contract-registry'

export interface CompatibilityResult {
  compatible: boolean
  issues: CompatibilityIssue[]
  migrationRequired: boolean
  migrationPath?: string[]
}

/**
 * Check compatibility between config and target schema version
 */
export function checkCompatibility(
  config: ThemeConfig,
  targetSchemaVersion: string
): CompatibilityResult {
  const contract = getTokenContract(targetSchemaVersion)
  const issues: CompatibilityIssue[] = []
  let migrationRequired = false

  // Check for missing required tokens
  const missingRequired = findMissingRequiredTokens(config, contract)
  if (missingRequired.length > 0) {
    migrationRequired = true
    issues.push(
      ...missingRequired.map((token) => ({
        severity: 'error' as const,
        token,
        message: `Required token missing: ${token}`,
        suggestion: `Add ${token} to your theme config`,
      }))
    )
  }

  // Check for deprecated tokens
  const deprecated = findDeprecatedTokens(config, contract)
  if (deprecated.length > 0) {
    issues.push(
      ...deprecated.map((dep) => ({
        severity: 'warning' as const,
        token: dep.path,
        message: `Token ${dep.path} is deprecated${dep.deprecatedIn ? ` (since ${dep.deprecatedIn})` : ''}`,
        suggestion: dep.replacement ? `Use ${dep.replacement} instead` : undefined,
      }))
    )
  }

  // Check for invalid token types
  const typeIssues = validateTokenTypes(config, contract)
  issues.push(...typeIssues)

  return {
    compatible: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    migrationRequired,
    migrationPath: migrationRequired ? [targetSchemaVersion] : undefined,
  }
}

/**
 * Find missing required tokens
 */
export function findMissingRequiredTokens(
  config: ThemeConfig,
  contract: ThemeTokenContract
): string[] {
  const missing: string[] = []

  for (const category of Object.values(contract.tokens)) {
    for (const token of category.required) {
      if (!hasToken(config, token.path)) {
        missing.push(token.path)
      }
    }
  }

  return missing
}

/**
 * Find deprecated tokens in config
 */
export function findDeprecatedTokens(
  config: ThemeConfig,
  contract: ThemeTokenContract
): DeprecatedToken[] {
  const found: DeprecatedToken[] = []

  for (const category of Object.values(contract.tokens)) {
    if (category.deprecated) {
      for (const dep of category.deprecated) {
        if (hasToken(config, dep.path)) {
          found.push(dep)
        }
      }
    }
  }

  return found
}

/**
 * Validate token types
 */
export function validateTokenTypes(
  config: ThemeConfig,
  contract: ThemeTokenContract
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []

  for (const [categoryName, category] of Object.entries(contract.tokens)) {
    for (const token of [...category.required, ...category.optional]) {
      const value = getTokenValue(config, token.path)
      if (value !== undefined) {
        const typeValid = validateTokenType(value, token.type, token.validation)
        if (!typeValid.valid) {
          issues.push({
            severity: 'error',
            token: token.path,
            message: typeValid.message || `Invalid type for ${token.path}`,
            suggestion: `Expected ${token.type}, got ${typeof value}`,
          })
        }
      }
    }
  }

  return issues
}

/**
 * Check if token exists in config
 */
function hasToken(config: ThemeConfig, path: string): boolean {
  return getTokenValue(config, path) !== undefined
}

/**
 * Get token value from config using path
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
  // Type check
  if (expectedType === 'color' && typeof value === 'string') {
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return { valid: false, message: `Color value does not match pattern: ${validation.pattern}` }
    }
    return { valid: true }
  }

  if (expectedType === 'size' && typeof value === 'string') {
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return { valid: false, message: `Size value does not match pattern: ${validation.pattern}` }
    }
    return { valid: true }
  }

  if (expectedType === 'string' && typeof value === 'string') {
    if (validation.max && value.length > validation.max) {
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

  if (expectedType === 'number' && typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return { valid: false, message: `Number below minimum: ${validation.min}` }
    }
    if (validation.max !== undefined && value > validation.max) {
      return { valid: false, message: `Number above maximum: ${validation.max}` }
    }
    return { valid: true }
  }

  if (expectedType === 'boolean' && typeof value === 'boolean') {
    return { valid: true }
  }

  if (expectedType === 'array' && Array.isArray(value)) {
    return { valid: true }
  }

  if (expectedType === 'object' && typeof value === 'object' && value !== null) {
    return { valid: true }
  }

  return { valid: false, message: `Expected ${expectedType}, got ${typeof value}` }
}
