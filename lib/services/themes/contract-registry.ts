import type { ThemeTokenContract } from './token-contract'
import { themeTokenContractV1 } from './token-contracts/v1'

/**
 * Registry for theme token contracts by version
 */
export const tokenContractRegistry: Record<string, ThemeTokenContract> = {
  '1.0.0': themeTokenContractV1,
  // Future versions will be added here
  // '1.1.0': themeTokenContractV1_1,
  // '2.0.0': themeTokenContractV2,
}

/**
 * Get token contract for a specific version
 */
export function getTokenContract(version: string): ThemeTokenContract {
  const contract = tokenContractRegistry[version]
  if (!contract) {
    throw new Error(`Token contract version ${version} not found. Available versions: ${listAvailableVersions().join(', ')}`)
  }
  return contract
}

/**
 * Get latest contract version
 */
export function getLatestContractVersion(): string {
  const versions = listAvailableVersions()
  if (versions.length === 0) {
    throw new Error('No token contracts available')
  }
  // Sort versions and return latest
  return versions.sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number)
    if (aMajor !== bMajor) return bMajor - aMajor
    if (aMinor !== bMinor) return bMinor - aMinor
    return bPatch - aPatch
  })[0]
}

/**
 * List all available contract versions
 */
export function listAvailableVersions(): string[] {
  return Object.keys(tokenContractRegistry)
}

/**
 * Check if a version exists
 */
export function hasContractVersion(version: string): boolean {
  return version in tokenContractRegistry
}

/**
 * Detect schema version from config structure
 * Attempts to infer version from config shape
 */
export function detectSchemaVersion(config: unknown): string {
  // For now, default to 1.0.0
  // In future, we can detect based on structure
  // e.g., if config has new v2 features, return '2.0.0'
  
  if (typeof config !== 'object' || config === null) {
    return '1.0.0'
  }

  const cfg = config as Record<string, unknown>
  
  // Check for v1 structure
  if (
    cfg.colors &&
    typeof cfg.colors === 'object' &&
    'primary' in cfg.colors &&
    typeof (cfg.colors as Record<string, unknown>).primary === 'object'
  ) {
    return '1.0.0'
  }

  // Default to latest
  return getLatestContractVersion()
}
