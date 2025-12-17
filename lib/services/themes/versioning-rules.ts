/**
 * Versioning Rules for Theme Token Contracts
 * Defines rules for schema version evolution
 */

export interface VersioningRule {
  version: string
  breakingChanges: string[]
  additions: string[]
  deprecations: string[]
  migrationGuide?: string
}

/**
 * Versioning rules for each schema version
 */
export const versioningRules: Record<string, VersioningRule> = {
  '1.0.0': {
    version: '1.0.0',
    breakingChanges: [],
    additions: [
      'colors.primary scale (50-900)',
      'colors.secondary scale (50-900)',
      'colors.semantic scales (success, error, warning, info)',
      'colors.neutral scale (50-900)',
      'colors.dark mode variants',
      'spacing.tokens',
      'spacing.scale array',
      'typography.weights',
      'typography.lineHeights',
      'typography.letterSpacing',
      'layout.breakpoints',
      'layout.containerWidths',
      'layout.gridColumns',
      'animations.durations',
      'animations.easings',
      'assets.* (all optional)',
    ],
    deprecations: [],
    migrationGuide: `
# Migration to v1.0.0

## From Legacy Format

If you have a theme in the old format (simple color strings), it will be automatically migrated:

1. **Colors**: Simple color strings are converted to scale format
   - \`primary: "#000000"\` → \`primary: { 500: "#000000", ... }\`

2. **Spacing**: Added default spacing tokens and scale
   - Default tokens: xs, sm, md, lg, xl, 2xl, 3xl
   - Default scale: [0, 4, 8, 16, 24, 32, 48, 64, 96, 128]

3. **Typography**: Enhanced with weights, lineHeights, letterSpacing
   - Default weights: light (300), normal (400), medium (500), semibold (600), bold (700)
   - Default lineHeights: tight (1.25), normal (1.5), relaxed (1.75)
   - Default letterSpacing: tight (-0.025em), normal (0), wide (0.025em)

4. **Layout**: Added breakpoints and containerWidths
   - Default breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
   - Default containerWidths: sm, md, lg, xl

5. **Animations**: Enhanced with durations and easings
   - Default durations: fast (100ms), normal (200ms), slow (300ms)
   - Default easings: easeIn, easeOut, easeInOut

## Required Tokens

Ensure these tokens are present in your theme:
- colors.primary.500
- colors.secondary.500
- colors.success.500
- colors.error.500
- colors.warning.500
- colors.info.500
- colors.neutral.500
- colors.background.default
- colors.text.default
- typography.fontFamily
- typography.headingFont
- typography.sizes.base
- typography.weights.normal
- spacing.tokens.md
- spacing.scale
- layout.variant
- layout.heroStyle
- layout.breakpoints.sm
- layout.gridColumns
- animations.enabled
    `.trim(),
  },
  // Future versions will be added here
  // '1.1.0': { ... },
  // '2.0.0': { ... },
}

/**
 * Get versioning rule for a specific version
 */
export function getVersioningRule(version: string): VersioningRule | null {
  return versioningRules[version] || null
}

/**
 * Check if version has breaking changes
 */
export function hasBreakingChanges(version: string): boolean {
  const rule = getVersioningRule(version)
  return rule ? rule.breakingChanges.length > 0 : false
}

/**
 * Get migration guide for a version
 */
export function getMigrationGuide(version: string): string | undefined {
  const rule = getVersioningRule(version)
  return rule?.migrationGuide
}
