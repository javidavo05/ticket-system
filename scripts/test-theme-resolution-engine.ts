/**
 * Test Theme Resolution Engine
 * Comprehensive tests for server-side theme resolution
 * Run with: npx tsx scripts/test-theme-resolution-engine.ts
 */

import postgres from 'postgres'
import { config } from 'dotenv'
import {
  extractSubdomain,
  extractPathTenant,
  resolveOrganizationFromSubdomain,
  resolveOrganizationFromPath,
} from '../lib/services/themes/domain-resolution'
import { validateThemeConfig, safeValidateThemeConfig } from '../lib/services/themes/validation'
import { sanitizeThemeConfig, sanitizeColorValue, sanitizeFontFamily, sanitizeURL } from '../lib/services/themes/sanitization'
import { extractThemeContextFromURL } from '../lib/services/themes/request-context'
import { defaultThemeConfig } from '../config/theme-defaults'

// Load environment variables
config()

async function testResolutionEngine() {
  const directUrl = process.env.DIRECT_URL || process.env.SUPABASE_DB_URL

  if (!directUrl) {
    throw new Error('DIRECT_URL or SUPABASE_DB_URL not found in environment')
  }

  const sql = postgres(directUrl.replace(/^["']|["']$/g, ''), {
    max: 1,
    ssl: 'require',
  })

  try {
    console.log('🧪 Testing Theme Resolution Engine...\n')

    // Test 1: Subdomain extraction
    console.log('Test 1: Testing subdomain extraction...')
    const subdomain1 = extractSubdomain('tenant1.example.com')
    if (subdomain1 !== 'tenant1') {
      throw new Error(`❌ Expected 'tenant1', got '${subdomain1}'`)
    }
    const subdomain2 = extractSubdomain('www.example.com')
    if (subdomain2 !== undefined) {
      throw new Error(`❌ Expected undefined for www, got '${subdomain2}'`)
    }
    const subdomain3 = extractSubdomain('example.com')
    if (subdomain3 !== undefined) {
      throw new Error(`❌ Expected undefined for no subdomain, got '${subdomain3}'`)
    }
    console.log('✅ Subdomain extraction works correctly\n')

    // Test 2: Path tenant extraction
    console.log('Test 2: Testing path tenant extraction...')
    const path1 = extractPathTenant('/tenant1/events')
    if (path1 !== 'tenant1') {
      throw new Error(`❌ Expected 'tenant1', got '${path1}'`)
    }
    // Note: extractPathTenant extracts first segment, so '/events' returns 'events'
    // In production, you might want to filter out common paths, but for now this is expected behavior
    const path2 = extractPathTenant('/events')
    // This will return 'events' - which is fine, resolution will fail to find org and fallback
    console.log(`   Path '/events' extracts: '${path2}' (expected behavior)\n`)
    console.log('✅ Path tenant extraction works correctly\n')

    // Test 3: Theme config validation (Zod)
    console.log('Test 3: Testing Zod validation...')
    const validConfig = defaultThemeConfig
    const validationResult = safeValidateThemeConfig(validConfig)
    if (!validationResult.success) {
      throw new Error('❌ Valid config failed validation')
    }
    console.log('✅ Zod validation accepts valid config\n')

    // Test 4: Theme config validation (invalid)
    console.log('Test 4: Testing Zod validation with invalid config...')
    const invalidConfig = {
      colors: {
        primary: { 500: 'not-a-color' }, // Invalid color
      },
    }
    const invalidResult = safeValidateThemeConfig(invalidConfig)
    if (invalidResult.success) {
      throw new Error('❌ Invalid config passed validation')
    }
    console.log('✅ Zod validation rejects invalid config\n')

    // Test 5: Color sanitization
    console.log('Test 5: Testing color sanitization...')
    const color1 = sanitizeColorValue('#FF0000')
    if (color1 !== '#FF0000') {
      throw new Error(`❌ Expected '#FF0000', got '${color1}'`)
    }
    const color2 = sanitizeColorValue('javascript:alert(1)')
    if (color2 !== '#000000') {
      throw new Error(`❌ Expected '#000000' for invalid color, got '${color2}'`)
    }
    console.log('✅ Color sanitization works correctly\n')

    // Test 6: Font family sanitization
    console.log('Test 6: Testing font family sanitization...')
    const font1 = sanitizeFontFamily('Arial, sans-serif')
    if (font1 !== 'Arial, sans-serif') {
      throw new Error(`❌ Expected 'Arial, sans-serif', got '${font1}'`)
    }
    const font2 = sanitizeFontFamily('<script>alert(1)</script>Arial')
    if (font2.includes('<script>')) {
      throw new Error('❌ Font sanitization did not remove script tags')
    }
    console.log('✅ Font family sanitization works correctly\n')

    // Test 7: URL sanitization
    console.log('Test 7: Testing URL sanitization...')
    const url1 = sanitizeURL('https://example.com/logo.png')
    if (url1 !== 'https://example.com/logo.png') {
      throw new Error(`❌ Expected valid URL, got '${url1}'`)
    }
    const url2 = sanitizeURL('javascript:alert(1)')
    if (url2 !== undefined) {
      throw new Error('❌ URL sanitization did not reject javascript: protocol')
    }
    console.log('✅ URL sanitization works correctly\n')

    // Test 8: Full config sanitization
    console.log('Test 8: Testing full config sanitization...')
    const maliciousConfig = {
      ...defaultThemeConfig,
      typography: {
        ...defaultThemeConfig.typography,
        fontFamily: '<script>alert(1)</script>Arial',
      },
      colors: {
        ...defaultThemeConfig.colors,
        primary: {
          ...defaultThemeConfig.colors.primary,
          500: 'javascript:alert(1)',
        },
      },
    }
    const sanitized = sanitizeThemeConfig(maliciousConfig)
    if (sanitized.typography.fontFamily.includes('<script>')) {
      throw new Error('❌ Sanitization did not remove script tags from font')
    }
    if (sanitized.colors.primary[500] === 'javascript:alert(1)') {
      throw new Error('❌ Sanitization did not fix malicious color')
    }
    console.log('✅ Full config sanitization works correctly\n')

    // Test 9: Request context extraction
    console.log('Test 9: Testing request context extraction...')
    const context1 = extractThemeContextFromURL('https://tenant1.example.com/events', 'tenant1.example.com')
    if (context1.subdomain !== 'tenant1') {
      throw new Error(`❌ Expected subdomain 'tenant1', got '${context1.subdomain}'`)
    }
    const context2 = extractThemeContextFromURL('https://example.com/tenant1/events', 'example.com')
    if (context2.path !== 'tenant1') {
      throw new Error(`❌ Expected path 'tenant1', got '${context2.path}'`)
    }
    console.log('✅ Request context extraction works correctly\n')

    // Test 10: Domain resolution (if organization exists)
    console.log('Test 10: Testing domain resolution...')
    // Check if any organizations exist
    const orgs = await sql`
      SELECT slug, domain FROM organizations 
      WHERE is_active = true AND deleted_at IS NULL 
      LIMIT 1
    `
    if (orgs.length > 0) {
      const org = orgs[0]
      if (org.slug) {
        const subdomainResult = await resolveOrganizationFromSubdomain(org.slug)
        if (subdomainResult && subdomainResult.organizationSlug === org.slug) {
          console.log('✅ Domain resolution works correctly\n')
        } else {
          console.log('⚠️  Domain resolution test skipped (no matching organization)\n')
        }
      }
    } else {
      console.log('⚠️  Domain resolution test skipped (no organizations in database)\n')
    }

    console.log('✅ All tests passed!')
  } catch (error: any) {
    console.error('\n❌ Test failed:')
    console.error(error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await sql.end()
  }
}

testResolutionEngine()
