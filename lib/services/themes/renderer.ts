import { ThemeConfig } from './loader'

export function generateThemeCSS(theme: ThemeConfig): string {
  return `
    :root {
      --color-primary: ${theme.colors.primary};
      --color-secondary: ${theme.colors.secondary};
      --color-accent: ${theme.colors.accent};
      --color-background: ${theme.colors.background};
      --color-text: ${theme.colors.text};
      --font-family: ${theme.typography.fontFamily};
      --font-heading: ${theme.typography.headingFont};
      --transition-default: ${theme.animations.transitions.default || '150ms ease-in-out'};
    }
  `
}

export function applyThemeStyles(theme: ThemeConfig): React.CSSProperties {
  return {
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    '--color-background': theme.colors.background,
    '--color-text': theme.colors.text,
  } as React.CSSProperties
}

