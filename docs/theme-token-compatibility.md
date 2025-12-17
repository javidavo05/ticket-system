# Theme Token Compatibility Guidelines

## Overview

This document defines the compatibility rules and versioning strategy for theme token contracts. The token contract ensures design consistency, prevents runtime errors, and enables safe theme evolution.

## Schema Versioning

Theme token contracts use semantic versioning format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (removed required tokens, type changes)
- **MINOR**: Additions (new optional tokens, new categories)
- **PATCH**: Fixes (validation improvements, documentation updates)

### Current Version

- **v1.0.0**: Initial token contract with comprehensive design system tokens

## Backward Compatibility Strategy

The system uses **migration-based backward compatibility**:

1. **Auto-Detection**: Automatically detects schema version from config structure
2. **Auto-Migration**: Migrates old schemas to current version automatically
3. **Default Application**: Applies default values for missing optional tokens
4. **Deprecation Handling**: Removes deprecated tokens with warnings
5. **Strict Validation**: Validates migrated config against current contract

## Migration Rules

### Rule 1: Required Tokens Cannot Be Removed

Required tokens in a schema version must remain required in future versions (unless major version bump). If a required token needs to be removed, it must:

1. Be deprecated in a minor version
2. Be marked for removal in a future major version
3. Have a replacement token provided

### Rule 2: Optional Tokens Can Be Added

New optional tokens can be added in any version without breaking compatibility. Missing optional tokens are automatically filled with default values during migration.

### Rule 3: Deprecated Tokens Have Grace Period

Deprecated tokens:
- Are removed during migration to new schema version
- Must have a `deprecatedIn` version specified
- Should have a `replacement` token if applicable
- Can specify `removalIn` version for planned removal

### Rule 4: Type Changes Require Major Version

Changing a token's type (e.g., `string` → `number`) requires a major version bump. This is a breaking change.

### Rule 5: Validation Changes

Tightening validation rules (e.g., adding pattern constraints) should be done in minor/patch versions with migration support.

## Required Tokens (v1.0.0)

### Colors

- `colors.primary.500` - Primary brand color (base shade)
- `colors.secondary.500` - Secondary brand color (base shade)
- `colors.success.500` - Success state color
- `colors.error.500` - Error state color
- `colors.warning.500` - Warning state color
- `colors.info.500` - Info state color
- `colors.neutral.500` - Neutral gray color (base shade)
- `colors.background.default` - Default background color
- `colors.text.default` - Default text color

### Typography

- `typography.fontFamily` - Default font family
- `typography.headingFont` - Font family for headings
- `typography.sizes.base` - Base font size
- `typography.weights.normal` - Normal font weight (400)

### Spacing

- `spacing.tokens.md` - Medium spacing token
- `spacing.scale` - Spacing scale array (numeric values)

### Layout

- `layout.variant` - Layout variant (`centered` | `wide` | `narrow`)
- `layout.heroStyle` - Hero section style (`image` | `video` | `gradient`)
- `layout.breakpoints.sm` - Small breakpoint
- `layout.gridColumns` - Number of grid columns (1-24)

### Animations

- `animations.enabled` - Whether animations are enabled (boolean)

## Optional Tokens

All other tokens are optional and will use default values if not provided:

- Color scale values (50-900) except 500
- Typography weights (light, medium, semibold, bold)
- Typography lineHeights and letterSpacing
- Layout breakpoints (md, lg, xl, 2xl)
- Layout containerWidths
- Animation transitions, durations, easings
- All asset references

## Validation Flow

```
1. Input Theme Config
2. Detect Schema Version (or use provided)
3. Validate Against Zod Schema (basic structure)
4. Get Token Contract for Version
5. Validate Against Contract
   ├─ Check Required Tokens
   ├─ Validate Token Types
   └─ Check Deprecated Tokens
6. If Invalid:
   ├─ Try Auto-Migration
   ├─ Apply Default Values
   └─ Re-validate
7. Return Validated Config
```

## Compatibility Checking

Use `checkCompatibility()` to verify if a theme config is compatible with a target schema version:

```typescript
import { checkCompatibility } from '@/lib/services/themes/compatibility'

const result = checkCompatibility(config, '1.0.0')
if (!result.compatible) {
  // Handle errors
  result.issues.forEach(issue => {
    if (issue.severity === 'error') {
      console.error(issue.message)
    }
  })
}
```

## Migration

Themes are automatically migrated when:

1. Loading a theme with an older schema version
2. Creating a new theme version
3. Validating a theme config

Migration process:

1. Remove deprecated tokens
2. Apply default values for missing optional tokens
3. Ensure all required tokens exist
4. Validate migrated config

## Versioning Rules

### Schema Version vs Theme Version

- **Schema Version**: Token contract version (e.g., "1.0.0")
- **Theme Version**: Theme instance version (integer, e.g., 1, 2, 3)

These are independent:
- A theme can have multiple versions (1, 2, 3) all using schema v1.0.0
- Schema version tracks the token contract structure
- Theme version tracks changes to a specific theme instance

### Breaking Changes

Breaking changes require a major version bump:

- Removing a required token
- Changing a token's type
- Changing a token's validation rules in a way that invalidates existing values

### Non-Breaking Changes

These can be done in minor/patch versions:

- Adding new optional tokens
- Adding new token categories
- Improving validation (with migration support)
- Deprecating tokens (with replacement)

## Best Practices

1. **Always specify schema version** when creating themes
2. **Test migrations** before deploying schema changes
3. **Document deprecations** with clear migration paths
4. **Use defaults** for optional tokens to ensure consistency
5. **Validate early** - validate configs before saving to database

## Examples

### Creating a Theme with Contract Validation

```typescript
import { validateThemeConfigWithContract } from '@/lib/services/themes/validation'

const config = { /* theme config */ }
const validated = await validateThemeConfigWithContract(config, '1.0.0')
// Config is now validated and migrated if needed
```

### Checking Compatibility

```typescript
import { checkCompatibility } from '@/lib/services/themes/compatibility'

const result = checkCompatibility(config, '1.0.0')
if (result.migrationRequired) {
  console.log('Migration needed:', result.migrationPath)
}
```

### Manual Migration

```typescript
import { migrateThemeConfig } from '@/lib/services/themes/migration'

const result = migrateThemeConfig(config, '0.9.0', '1.0.0')
console.log('Changes:', result.changes)
console.log('Warnings:', result.warnings)
```

## Future Versions

When creating new schema versions:

1. Update `token-contracts/v{N}.ts` with new contract
2. Add to `contract-registry.ts`
3. Update `versioning-rules.ts` with migration guide
4. Test migration from previous version
5. Update this documentation
