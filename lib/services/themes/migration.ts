import type { ThemeConfig } from './loader'
import type { ThemeTokenContract, MigrationChange } from './token-contract'
import { detectSchemaVersion } from './contract-registry'
import { defaultThemeConfig } from '@/config/theme-defaults'

export interface MigrationResult {
  migrated: ThemeConfig
  changes: MigrationChange[]
  warnings: string[]
}

/**
 * Migrate theme config from one schema version to another
 */
export function migrateThemeConfig(
  config: ThemeConfig,
  fromVersion: string,
  toVersion: string
): MigrationResult {
  const changes: MigrationChange[] = []
  const warnings: string[] = []

  // If versions are the same, no migration needed
  if (fromVersion === toVersion) {
    return {
      migrated: config,
      changes: [],
      warnings: [],
    }
  }

  // Get contracts (dynamic import to avoid circular dependency)
  const { getTokenContract } = require('./contract-registry')
  const fromContract = getTokenContract(fromVersion)
  const toContract = getTokenContract(toVersion)

  // Start with a copy of the config
  const migrated: ThemeConfig = JSON.parse(JSON.stringify(config))

  // Step 1: Remove deprecated tokens
  const removed = removeDeprecatedTokens(migrated, toContract)
  changes.push(...removed.changes)
  warnings.push(...removed.warnings)

  // Step 2: Apply default values for missing optional tokens
  const defaults = applyDefaultTokens(migrated, toContract)
  changes.push(...defaults.changes)

  // Step 3: Ensure required tokens exist (use defaults if missing)
  for (const category of Object.values(toContract.tokens)) {
    for (const token of category.required) {
      if (!hasToken(migrated, token.path)) {
        const defaultValue = getDefaultValue(token.path, toContract)
        setTokenValue(migrated, token.path, defaultValue)
        changes.push({
          token: token.path,
          action: 'added',
          newValue: defaultValue,
        })
        warnings.push(`Added required token ${token.path} with default value`)
      }
    }
  }

  return {
    migrated,
    changes,
    warnings,
  }
}

/**
 * Apply default values for missing optional tokens
 */
export function applyDefaultTokens(
  config: ThemeConfig,
  contract: ThemeTokenContract
): { config: ThemeConfig; changes: MigrationChange[] } {
  const changes: MigrationChange[] = []
  const updated = JSON.parse(JSON.stringify(config)) as ThemeConfig

  for (const category of Object.values(contract.tokens)) {
    for (const token of category.optional) {
      if (!hasToken(updated, token.path) && token.defaultValue !== undefined) {
        setTokenValue(updated, token.path, token.defaultValue)
        changes.push({
          token: token.path,
          action: 'added',
          newValue: token.defaultValue,
        })
      }
    }
  }

  return { config: updated, changes }
}

/**
 * Remove deprecated tokens
 */
export function removeDeprecatedTokens(
  config: ThemeConfig,
  contract: ThemeTokenContract
): { config: ThemeConfig; changes: MigrationChange[]; warnings: string[] } {
  const changes: MigrationChange[] = []
  const warnings: string[] = []
  const updated = JSON.parse(JSON.stringify(config)) as ThemeConfig

  for (const category of Object.values(contract.tokens)) {
    if (category.deprecated) {
      for (const dep of category.deprecated) {
        if (hasToken(updated, dep.path)) {
          const oldValue = getTokenValue(updated, dep.path)
          removeToken(updated, dep.path)
          changes.push({
            token: dep.path,
            action: 'removed',
            oldValue,
          })
          warnings.push(
            `Removed deprecated token ${dep.path}${dep.replacement ? `. Use ${dep.replacement} instead` : ''}`
          )
        }
      }
    }
  }

  return { config: updated, changes, warnings }
}

/**
 * Check if token exists in config
 */
function hasToken(config: ThemeConfig, path: string): boolean {
  return getTokenValue(config, path) !== undefined
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
 * Set token value in config
 */
function setTokenValue(config: ThemeConfig, path: string, value: unknown): void {
  const parts = path.split('.')
  let current: any = config

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (current[part] === undefined || current[part] === null) {
      current[part] = {}
    }
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Remove token from config
 */
function removeToken(config: ThemeConfig, path: string): void {
  const parts = path.split('.')
  let current: any = config

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (current[part] === undefined || current[part] === null) {
      return
    }
    current = current[part]
  }

  delete current[parts[parts.length - 1]]
}

/**
 * Get default value for a token path
 */
function getDefaultValue(path: string, contract: ThemeTokenContract): unknown {
  // First, check if token has a default in contract
  for (const category of Object.values(contract.tokens)) {
    for (const token of [...category.required, ...category.optional]) {
      if (token.path === path && token.defaultValue !== undefined) {
        return token.defaultValue
      }
    }
  }

  // Fallback to default theme config
  const defaultValue = getTokenValue(defaultThemeConfig, path)
  if (defaultValue !== undefined) {
    return defaultValue
  }

  // Last resort defaults based on type
  if (path.includes('color') || path.includes('primary') || path.includes('secondary')) {
    return '#000000'
  }
  if (path.includes('size') || path.includes('spacing')) {
    return '1rem'
  }
  if (path.includes('weight')) {
    return 400
  }
  if (path.includes('enabled')) {
    return true
  }

  return null
}

/**
 * Auto-migrate config to latest schema version
 */
export function autoMigrateToLatest(config: ThemeConfig): MigrationResult {
  // Use require to avoid circular dependency issues
  const contractRegistry = require('./contract-registry')
  const detectedVersion = detectSchemaVersion(config)
  const latestVersion = contractRegistry.getLatestContractVersion()

  return migrateThemeConfig(config, detectedVersion, latestVersion)
}
