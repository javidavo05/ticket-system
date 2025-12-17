import type { ThemeTokenContract } from '../token-contract'

/**
 * Theme Token Contract v1.0.0
 * Defines all required and optional tokens for theme configuration
 */
export const themeTokenContractV1: ThemeTokenContract = {
  schemaVersion: '1.0.0',
  tokens: {
    colors: {
      required: [
        {
          path: 'colors.primary.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Primary brand color (base shade)',
        },
        {
          path: 'colors.secondary.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Secondary brand color (base shade)',
        },
        {
          path: 'colors.success.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Success state color',
        },
        {
          path: 'colors.error.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Error state color',
        },
        {
          path: 'colors.warning.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Warning state color',
        },
        {
          path: 'colors.info.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Info state color',
        },
        {
          path: 'colors.neutral.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Neutral gray color (base shade)',
        },
        {
          path: 'colors.background.default',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Default background color',
        },
        {
          path: 'colors.text.default',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Default text color',
        },
      ],
      optional: [
        // Primary scale (50-900, excluding 500 which is required)
        ...['50', '100', '200', '300', '400', '600', '700', '800', '900'].map((shade) => ({
          path: `colors.primary.${shade}`,
          type: 'color' as const,
          defaultValue: '#000000',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: `Primary color shade ${shade}`,
        })),
        // Secondary scale
        ...['50', '100', '200', '300', '400', '600', '700', '800', '900'].map((shade) => ({
          path: `colors.secondary.${shade}`,
          type: 'color' as const,
          defaultValue: '#666666',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: `Secondary color shade ${shade}`,
        })),
        // Semantic color scales
        ...['success', 'error', 'warning', 'info'].flatMap((semantic) =>
          ['50', '100', '200', '300', '400', '600', '700', '800', '900'].map((shade) => ({
            path: `colors.${semantic}.${shade}`,
            type: 'color' as const,
            defaultValue: '#000000',
            validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
            description: `${semantic} color shade ${shade}`,
          }))
        ),
        // Neutral scale (excluding 500)
        ...['50', '100', '200', '300', '400', '600', '700', '800', '900'].map((shade) => ({
          path: `colors.neutral.${shade}`,
          type: 'color' as const,
          defaultValue: '#6B7280',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: `Neutral color shade ${shade}`,
        })),
        // Accent
        {
          path: 'colors.accent.500',
          type: 'color',
          defaultValue: '#FFD700',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Accent color',
        },
        // Dark mode variants (all optional)
        {
          path: 'colors.dark.primary.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Primary color for dark mode',
        },
        {
          path: 'colors.dark.secondary.500',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Secondary color for dark mode',
        },
        {
          path: 'colors.dark.background.default',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Background color for dark mode',
        },
        {
          path: 'colors.dark.text.default',
          type: 'color',
          validation: { pattern: '^#[0-9A-Fa-f]{6}$' },
          description: 'Text color for dark mode',
        },
      ],
      deprecated: [],
    },
    typography: {
      required: [
        {
          path: 'typography.fontFamily',
          type: 'string',
          defaultValue: 'system-ui, -apple-system, sans-serif',
          validation: { pattern: "^[a-zA-Z0-9\\s,'\"\\-_]+$", max: 200 },
          description: 'Default font family',
        },
        {
          path: 'typography.headingFont',
          type: 'string',
          defaultValue: 'system-ui, -apple-system, sans-serif',
          validation: { pattern: "^[a-zA-Z0-9\\s,'\"\\-_]+$", max: 200 },
          description: 'Font family for headings',
        },
        {
          path: 'typography.sizes.base',
          type: 'size',
          defaultValue: '1rem',
          validation: { pattern: '^-?\\d+(\\.\\d+)?(rem|em|px|%|vh|vw)$' },
          description: 'Base font size',
        },
        {
          path: 'typography.weights.normal',
          type: 'number',
          defaultValue: 400,
          validation: { min: 100, max: 900 },
          description: 'Normal font weight',
        },
      ],
      optional: [
        // Font sizes (excluding base)
        ...['xs', 'sm', 'lg', 'xl', '2xl', '3xl', '4xl'].map((size) => ({
          path: `typography.sizes.${size}`,
          type: 'size' as const,
          defaultValue: '1rem',
          validation: { pattern: '^-?\\d+(\\.\\d+)?(rem|em|px|%|vh|vw)$' },
          description: `Font size ${size}`,
        })),
        // Font weights
        {
          path: 'typography.weights.light',
          type: 'number',
          defaultValue: 300,
          validation: { min: 100, max: 900 },
          description: 'Light font weight',
        },
        {
          path: 'typography.weights.medium',
          type: 'number',
          defaultValue: 500,
          validation: { min: 100, max: 900 },
          description: 'Medium font weight',
        },
        {
          path: 'typography.weights.semibold',
          type: 'number',
          defaultValue: 600,
          validation: { min: 100, max: 900 },
          description: 'Semibold font weight',
        },
        {
          path: 'typography.weights.bold',
          type: 'number',
          defaultValue: 700,
          validation: { min: 100, max: 900 },
          description: 'Bold font weight',
        },
        // Line heights (unitless numbers)
        {
          path: 'typography.lineHeights.tight',
          type: 'string',
          defaultValue: '1.25',
          validation: { pattern: '^\\d+(\\.\\d+)?$' },
          description: 'Tight line height (unitless)',
        },
        {
          path: 'typography.lineHeights.normal',
          type: 'string',
          defaultValue: '1.5',
          validation: { pattern: '^\\d+(\\.\\d+)?$' },
          description: 'Normal line height (unitless)',
        },
        {
          path: 'typography.lineHeights.relaxed',
          type: 'string',
          defaultValue: '1.75',
          validation: { pattern: '^\\d+(\\.\\d+)?$' },
          description: 'Relaxed line height (unitless)',
        },
        // Letter spacing
        {
          path: 'typography.letterSpacing.tight',
          type: 'string',
          defaultValue: '-0.025em',
          validation: { pattern: '^-?\\d+(\\.\\d+)?(em|px|rem)$' },
          description: 'Tight letter spacing',
        },
        {
          path: 'typography.letterSpacing.normal',
          type: 'string',
          defaultValue: '0',
          validation: { pattern: '^-?\\d+(\\.\\d+)?(em|px|rem)?$' },
          description: 'Normal letter spacing (can be unitless)',
        },
        {
          path: 'typography.letterSpacing.wide',
          type: 'string',
          defaultValue: '0.025em',
          validation: { pattern: '^-?\\d+(\\.\\d+)?(em|px|rem)$' },
          description: 'Wide letter spacing',
        },
      ],
      deprecated: [],
    },
    spacing: {
      required: [
        {
          path: 'spacing.tokens.md',
          type: 'size',
          defaultValue: '1rem',
          validation: { pattern: '^-?\\d+(\\.\\d+)?(rem|em|px|%|vh|vw)$' },
          description: 'Medium spacing token',
        },
        {
          path: 'spacing.scale',
          type: 'array',
          defaultValue: [0, 4, 8, 16, 24, 32, 48, 64, 96, 128],
          validation: {},
          description: 'Spacing scale array (numeric values)',
        },
      ],
      optional: [
        // Spacing tokens
        ...['xs', 'sm', 'lg', 'xl', '2xl', '3xl'].map((size) => ({
          path: `spacing.tokens.${size}`,
          type: 'size' as const,
          defaultValue: '1rem',
          validation: { pattern: '^-?\\d+(\\.\\d+)?(rem|em|px|%|vh|vw)$' },
          description: `Spacing token ${size}`,
        })),
      ],
      deprecated: [],
    },
    layout: {
      required: [
        {
          path: 'layout.variant',
          type: 'string',
          defaultValue: 'centered',
          validation: { enum: ['centered', 'wide', 'narrow'] },
          description: 'Layout variant',
        },
        {
          path: 'layout.heroStyle',
          type: 'string',
          defaultValue: 'image',
          validation: { enum: ['image', 'video', 'gradient'] },
          description: 'Hero section style',
        },
        {
          path: 'layout.breakpoints.sm',
          type: 'size',
          defaultValue: '640px',
          validation: { pattern: '^\\d+(px|rem|em)$' },
          description: 'Small breakpoint',
        },
        {
          path: 'layout.gridColumns',
          type: 'number',
          defaultValue: 12,
          validation: { min: 1, max: 24 },
          description: 'Number of grid columns',
        },
      ],
      optional: [
        // Breakpoints
        ...['md', 'lg', 'xl', '2xl'].map((bp) => ({
          path: `layout.breakpoints.${bp}`,
          type: 'size' as const,
          defaultValue: '768px',
          validation: { pattern: '^\\d+(px|rem|em)$' },
          description: `${bp} breakpoint`,
        })),
        // Container widths
        ...['sm', 'md', 'lg', 'xl'].map((size) => ({
          path: `layout.containerWidths.${size}`,
          type: 'size' as const,
          defaultValue: '768px',
          validation: { pattern: '^\\d+(px|rem|em)$' },
          description: `Container width ${size}`,
        })),
      ],
      deprecated: [],
    },
    animations: {
      required: [
        {
          path: 'animations.enabled',
          type: 'boolean',
          defaultValue: true,
          validation: {},
          description: 'Whether animations are enabled',
        },
      ],
      optional: [
        // Transitions
        {
          path: 'animations.transitions.default',
          type: 'string',
          defaultValue: '150ms ease-in-out',
          validation: { pattern: '^\\d+(ms|s)\\s+[a-z-]+' },
          description: 'Default transition',
        },
        {
          path: 'animations.transitions.fast',
          type: 'string',
          defaultValue: '100ms ease-in-out',
          validation: { pattern: '^\\d+(ms|s)\\s+[a-z-]+' },
          description: 'Fast transition',
        },
        {
          path: 'animations.transitions.slow',
          type: 'string',
          defaultValue: '300ms ease-in-out',
          validation: { pattern: '^\\d+(ms|s)\\s+[a-z-]+' },
          description: 'Slow transition',
        },
        // Durations
        {
          path: 'animations.durations.fast',
          type: 'size',
          defaultValue: '100ms',
          validation: { pattern: '^\\d+(ms|s)$' },
          description: 'Fast animation duration',
        },
        {
          path: 'animations.durations.normal',
          type: 'size',
          defaultValue: '200ms',
          validation: { pattern: '^\\d+(ms|s)$' },
          description: 'Normal animation duration',
        },
        {
          path: 'animations.durations.slow',
          type: 'size',
          defaultValue: '300ms',
          validation: { pattern: '^\\d+(ms|s)$' },
          description: 'Slow animation duration',
        },
        // Easings
        {
          path: 'animations.easings.easeIn',
          type: 'string',
          defaultValue: 'cubic-bezier(0.4, 0, 1, 1)',
          validation: { pattern: '^cubic-bezier\\([^)]+\\)$' },
          description: 'Ease-in timing function',
        },
        {
          path: 'animations.easings.easeOut',
          type: 'string',
          defaultValue: 'cubic-bezier(0, 0, 0.2, 1)',
          validation: { pattern: '^cubic-bezier\\([^)]+\\)$' },
          description: 'Ease-out timing function',
        },
        {
          path: 'animations.easings.easeInOut',
          type: 'string',
          defaultValue: 'cubic-bezier(0.4, 0, 0.2, 1)',
          validation: { pattern: '^cubic-bezier\\([^)]+\\)$' },
          description: 'Ease-in-out timing function',
        },
      ],
      deprecated: [],
    },
    assets: {
      required: [],
      optional: [
        {
          path: 'assets.logo',
          type: 'string',
          validation: { format: 'url' },
          description: 'Logo asset URL or ID',
        },
        {
          path: 'assets.logoDark',
          type: 'string',
          validation: { format: 'url' },
          description: 'Dark mode logo asset URL or ID',
        },
        {
          path: 'assets.favicon',
          type: 'string',
          validation: { format: 'url' },
          description: 'Favicon asset URL or ID',
        },
        {
          path: 'assets.background',
          type: 'string',
          validation: { format: 'url' },
          description: 'Background image asset URL or ID',
        },
        {
          path: 'assets.backgroundMobile',
          type: 'string',
          validation: { format: 'url' },
          description: 'Mobile background image asset URL or ID',
        },
        {
          path: 'assets.ogImage',
          type: 'string',
          validation: { format: 'url' },
          description: 'Open Graph image asset URL or ID',
        },
      ],
      deprecated: [],
    },
  },
}
