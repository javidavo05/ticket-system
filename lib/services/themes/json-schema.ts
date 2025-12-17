/**
 * JSON Schema for ThemeConfig validation
 * Can be used with ajv or other JSON Schema validators
 * 
 * To use with ajv:
 * import Ajv from 'ajv'
 * const ajv = new Ajv()
 * const validate = ajv.compile(themeConfigJSONSchema)
 * const valid = validate(config)
 */

export const themeConfigJSONSchema = {
  type: 'object',
  required: ['colors', 'typography', 'layout', 'animations'],
  additionalProperties: false,
  properties: {
    colors: {
      type: 'object',
      required: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'neutral', 'background', 'text'],
      additionalProperties: false,
      properties: {
        primary: {
          type: 'object',
          required: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
          additionalProperties: false,
          patternProperties: {
            '^(50|100|200|300|400|500|600|700|800|900)$': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        secondary: {
          type: 'object',
          required: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
          additionalProperties: false,
          patternProperties: {
            '^(50|100|200|300|400|500|600|700|800|900)$': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        success: {
          type: 'object',
          required: ['500'],
          additionalProperties: false,
          patternProperties: {
            '^(50|100|200|300|400|500|600|700|800|900)$': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        error: {
          type: 'object',
          required: ['500'],
          additionalProperties: false,
          patternProperties: {
            '^(50|100|200|300|400|500|600|700|800|900)$': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        warning: {
          type: 'object',
          required: ['500'],
          additionalProperties: false,
          patternProperties: {
            '^(50|100|200|300|400|500|600|700|800|900)$': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        info: {
          type: 'object',
          required: ['500'],
          additionalProperties: false,
          patternProperties: {
            '^(50|100|200|300|400|500|600|700|800|900)$': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        neutral: {
          type: 'object',
          required: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
          additionalProperties: false,
          patternProperties: {
            '^(50|100|200|300|400|500|600|700|800|900)$': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        accent: {
          type: 'object',
          required: ['500'],
          additionalProperties: false,
          properties: {
            '500': {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        background: {
          type: 'object',
          required: ['default'],
          additionalProperties: false,
          properties: {
            default: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        text: {
          type: 'object',
          required: ['default'],
          additionalProperties: false,
          properties: {
            default: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        dark: {
          type: 'object',
          additionalProperties: false,
          properties: {
            primary: {
              type: 'object',
              required: ['500'],
              additionalProperties: false,
              patternProperties: {
                '^(50|100|200|300|400|500|600|700|800|900)$': {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
            secondary: {
              type: 'object',
              required: ['500'],
              additionalProperties: false,
              patternProperties: {
                '^(50|100|200|300|400|500|600|700|800|900)$': {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
            success: {
              type: 'object',
              required: ['500'],
              additionalProperties: false,
              properties: {
                '500': {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
            error: {
              type: 'object',
              required: ['500'],
              additionalProperties: false,
              properties: {
                '500': {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
            warning: {
              type: 'object',
              required: ['500'],
              additionalProperties: false,
              properties: {
                '500': {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
            info: {
              type: 'object',
              required: ['500'],
              additionalProperties: false,
              properties: {
                '500': {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
            background: {
              type: 'object',
              required: ['default'],
              additionalProperties: false,
              properties: {
                default: {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
            text: {
              type: 'object',
              required: ['default'],
              additionalProperties: false,
              properties: {
                default: {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                },
              },
            },
          },
        },
      },
    },
    typography: {
      type: 'object',
      required: ['fontFamily', 'headingFont', 'sizes', 'weights', 'lineHeights', 'letterSpacing'],
      additionalProperties: false,
      properties: {
        fontFamily: {
          type: 'string',
          maxLength: 200,
          pattern: "^[a-zA-Z0-9\\s,'\"\\-_]+$",
        },
        headingFont: {
          type: 'string',
          maxLength: 200,
          pattern: "^[a-zA-Z0-9\\s,'\"\\-_]+$",
        },
        sizes: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
        weights: {
          type: 'object',
          required: ['light', 'normal', 'medium', 'semibold', 'bold'],
          additionalProperties: false,
          properties: {
            light: { type: 'number', minimum: 100, maximum: 900 },
            normal: { type: 'number', minimum: 100, maximum: 900 },
            medium: { type: 'number', minimum: 100, maximum: 900 },
            semibold: { type: 'number', minimum: 100, maximum: 900 },
            bold: { type: 'number', minimum: 100, maximum: 900 },
          },
        },
        lineHeights: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
        letterSpacing: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
    },
    spacing: {
      type: 'object',
      required: ['tokens', 'scale'],
      additionalProperties: false,
      properties: {
        tokens: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
        scale: {
          type: 'array',
          items: {
            type: 'number',
            minimum: 0,
          },
        },
      },
    },
    layout: {
      type: 'object',
      required: ['variant', 'heroStyle', 'breakpoints', 'containerWidths', 'gridColumns'],
      additionalProperties: false,
      properties: {
        variant: {
          type: 'string',
          enum: ['centered', 'wide', 'narrow'],
        },
        heroStyle: {
          type: 'string',
          enum: ['image', 'video', 'gradient'],
        },
        breakpoints: {
          type: 'object',
          required: ['sm', 'md', 'lg', 'xl', '2xl'],
          additionalProperties: false,
          properties: {
            sm: { type: 'string' },
            md: { type: 'string' },
            lg: { type: 'string' },
            xl: { type: 'string' },
            '2xl': { type: 'string' },
          },
        },
        containerWidths: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
        gridColumns: {
          type: 'number',
          minimum: 1,
          maximum: 24,
        },
      },
    },
    animations: {
      type: 'object',
      required: ['enabled', 'transitions', 'durations', 'easings'],
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        transitions: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
        durations: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
        easings: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
    },
    assets: {
      type: 'object',
      additionalProperties: false,
      properties: {
        logo: { type: 'string' },
        logoDark: { type: 'string' },
        favicon: { type: 'string' },
        background: { type: 'string' },
        backgroundMobile: { type: 'string' },
        ogImage: { type: 'string' },
      },
    },
  },
} as const

/**
 * Validate theme config using JSON Schema (requires ajv)
 * This is a wrapper that can be used when ajv is installed
 */
export async function validateThemeConfigJSONSchema(config: unknown): Promise<boolean> {
  try {
    // Dynamic import to avoid requiring ajv as a dependency
    const Ajv = (await import('ajv')).default
    const ajv = new Ajv()
    const validate = ajv.compile(themeConfigJSONSchema)
    return validate(config) as boolean
  } catch (error) {
    // If ajv is not installed, fall back to Zod validation
    console.warn('ajv not available, falling back to Zod validation')
    const { validateThemeConfig } = await import('./validation')
    try {
      validateThemeConfig(config)
      return true
    } catch {
      return false
    }
  }
}
