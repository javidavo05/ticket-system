import type { ThemeConfig } from './loader'

/**
 * Generate CSS variables object from theme config
 * Returns a flat object of CSS variable names to values
 */
export function getThemeCSSVariables(theme: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {}

  // Colors - Primary scale (50-900)
  if (theme.colors.primary) {
    Object.entries(theme.colors.primary).forEach(([shade, value]) => {
      vars[`--color-primary-${shade}`] = value
    })
  }

  // Colors - Secondary scale (50-900)
  if (theme.colors.secondary) {
    Object.entries(theme.colors.secondary).forEach(([shade, value]) => {
      vars[`--color-secondary-${shade}`] = value
    })
  }

  // Colors - Semantic colors (success, error, warning, info)
  const semanticColors = ['success', 'error', 'warning', 'info'] as const
  semanticColors.forEach((semantic) => {
    const color = theme.colors[semantic]
    if (color) {
      Object.entries(color).forEach(([shade, value]) => {
        if (value) {
          vars[`--color-${semantic}-${shade}`] = value
        }
      })
    }
  })

  // Colors - Neutral scale (50-900)
  if (theme.colors.neutral) {
    Object.entries(theme.colors.neutral).forEach(([shade, value]) => {
      vars[`--color-neutral-${shade}`] = value
    })
  }

  // Colors - Accent
  if (theme.colors.accent?.[500]) {
    vars['--color-accent-500'] = theme.colors.accent[500]
  }

  // Colors - Background and text
  if (theme.colors.background?.default) {
    vars['--color-background-default'] = theme.colors.background.default
  }
  if (theme.colors.text?.default) {
    vars['--color-text-default'] = theme.colors.text.default
  }

  // Colors - Dark mode variants
  if (theme.colors.dark) {
    if (theme.colors.dark.primary) {
      Object.entries(theme.colors.dark.primary).forEach(([shade, value]) => {
        if (value) {
          vars[`--color-dark-primary-${shade}`] = value
        }
      })
    }
    if (theme.colors.dark.secondary) {
      Object.entries(theme.colors.dark.secondary).forEach(([shade, value]) => {
        if (value) {
          vars[`--color-dark-secondary-${shade}`] = value
        }
      })
    }
    semanticColors.forEach((semantic) => {
      const color = theme.colors.dark?.[semantic]
      if (color && '500' in color && color[500]) {
        vars[`--color-dark-${semantic}-500`] = color[500]
      }
    })
    if (theme.colors.dark.background?.default) {
      vars['--color-dark-background-default'] = theme.colors.dark.background.default
    }
    if (theme.colors.dark.text?.default) {
      vars['--color-dark-text-default'] = theme.colors.dark.text.default
    }
  }

  // Typography - Font families
  vars['--font-family'] = theme.typography.fontFamily
  vars['--font-heading'] = theme.typography.headingFont

  // Typography - Font sizes
  if (theme.typography.sizes) {
    Object.entries(theme.typography.sizes).forEach(([size, value]) => {
      vars[`--font-size-${size}`] = value
    })
  }

  // Typography - Font weights
  if (theme.typography.weights) {
    Object.entries(theme.typography.weights).forEach(([weight, value]) => {
      vars[`--font-weight-${weight}`] = String(value)
    })
  }

  // Typography - Line heights
  if (theme.typography.lineHeights) {
    Object.entries(theme.typography.lineHeights).forEach(([name, value]) => {
      vars[`--line-height-${name}`] = value
    })
  }

  // Typography - Letter spacing
  if (theme.typography.letterSpacing) {
    Object.entries(theme.typography.letterSpacing).forEach(([name, value]) => {
      vars[`--letter-spacing-${name}`] = value
    })
  }

  // Spacing - Tokens
  if (theme.spacing.tokens) {
    Object.entries(theme.spacing.tokens).forEach(([token, value]) => {
      vars[`--spacing-${token}`] = value
    })
  }

  // Spacing - Scale (as array, exposed as individual variables)
  if (theme.spacing.scale && Array.isArray(theme.spacing.scale)) {
    theme.spacing.scale.forEach((value, index) => {
      vars[`--spacing-scale-${index}`] = `${value}px`
    })
  }

  // Layout - Variant and hero style
  vars['--layout-variant'] = theme.layout.variant
  vars['--layout-hero-style'] = theme.layout.heroStyle

  // Layout - Breakpoints
  if (theme.layout.breakpoints) {
    Object.entries(theme.layout.breakpoints).forEach(([bp, value]) => {
      vars[`--breakpoint-${bp}`] = value
    })
  }

  // Layout - Container widths
  if (theme.layout.containerWidths) {
    Object.entries(theme.layout.containerWidths).forEach(([size, value]) => {
      vars[`--container-width-${size}`] = value
    })
  }

  // Layout - Grid columns
  vars['--grid-columns'] = String(theme.layout.gridColumns)

  // Animations - Enabled flag
  vars['--animation-enabled'] = theme.animations.enabled ? '1' : '0'

  // Animations - Transitions
  if (theme.animations.transitions) {
    Object.entries(theme.animations.transitions).forEach(([name, value]) => {
      vars[`--transition-${name}`] = value
    })
  }

  // Animations - Durations
  if (theme.animations.durations) {
    Object.entries(theme.animations.durations).forEach(([name, value]) => {
      vars[`--duration-${name}`] = value
    })
  }

  // Animations - Easings
  if (theme.animations.easings) {
    Object.entries(theme.animations.easings).forEach(([name, value]) => {
      vars[`--easing-${name}`] = value
    })
  }

  return vars
}

/**
 * Generate CSS string with :root variables from theme config
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  const vars = getThemeCSSVariables(theme)
  const cssVars = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')

  return `:root {\n${cssVars}\n}`
}

/**
 * Generate CSS variables string (for inline style injection)
 * Returns CSS string that can be injected into <style> tag
 */
export function generateThemeCSSVariables(theme: ThemeConfig): string {
  return generateThemeCSS(theme)
}

/**
 * Apply theme styles as React CSSProperties
 * Returns an object that can be spread into style prop
 * @deprecated Use CSS variables instead for better performance
 */
export function applyThemeStyles(theme: ThemeConfig): React.CSSProperties {
  const vars = getThemeCSSVariables(theme)
  return vars as React.CSSProperties
}
