/**
 * Theme Token Contract
 * Defines the strict contract for theme tokens
 */

export interface ThemeTokenContract {
  schemaVersion: string // e.g., "1.0.0"
  tokens: {
    colors: TokenCategory
    typography: TokenCategory
    spacing: TokenCategory
    layout: TokenCategory
    animations: TokenCategory
    assets: TokenCategory
  }
}

export interface TokenCategory {
  required: TokenDefinition[]
  optional: TokenDefinition[]
  deprecated?: DeprecatedToken[]
}

export interface TokenDefinition {
  path: string // e.g., "colors.primary.500"
  type: 'color' | 'size' | 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: string | number | boolean | object | unknown[]
  validation: {
    pattern?: string
    min?: number
    max?: number
    enum?: string[]
    format?: string
  }
  description: string
}

export interface DeprecatedToken {
  path: string
  deprecatedIn: string // schema version
  replacement?: string
  removalIn?: string // schema version
  migrationNote?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  token: string
  message: string
  expected?: string
  actual?: unknown
}

export interface ValidationWarning {
  token: string
  message: string
  suggestion?: string
}

export interface MigrationChange {
  token: string
  action: 'added' | 'removed' | 'modified' | 'deprecated'
  oldValue?: unknown
  newValue?: unknown
}
