import { ThemeConfig } from '@/lib/services/themes/loader'

export const defaultThemeConfig: ThemeConfig = {
  colors: {
    primary: '#000000',
    secondary: '#666666',
    accent: '#FFD700',
    background: '#FFFFFF',
    text: '#000000',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    headingFont: 'system-ui, -apple-system, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
  },
  layout: {
    variant: 'centered',
    heroStyle: 'image',
  },
  animations: {
    enabled: true,
    transitions: {
      default: '150ms ease-in-out',
      fast: '100ms ease-in-out',
      slow: '300ms ease-in-out',
    },
  },
}

