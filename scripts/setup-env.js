#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const envPath = path.join(__dirname, '..', '.env')
const envExamplePath = path.join(__dirname, '..', '.env.example')

// Generate random secrets
const jwtSecret = crypto.randomBytes(32).toString('hex')
const encryptionKey = crypto.randomBytes(32).toString('hex')

const envContent = `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# Connection pooling (for app)
DATABASE_URL=postgresql://postgres.ijfexclrwxrnfbemdtox:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
# Direct connection (for migrations)
DIRECT_URL=postgresql://postgres.ijfexclrwxrnfbemdtox:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
# Legacy (for compatibility)
SUPABASE_DB_URL=postgresql://postgres.ijfexclrwxrnfbemdtox:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Auth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment Providers
YAPPY_API_KEY=your_yappy_api_key
YAPPY_MERCHANT_ID=your_yappy_merchant_id
PAGUELOFACIL_API_KEY=your_paguelofacil_api_key
PAGUELOFACIL_SECRET=your_paguelofacil_secret

# Email (Brevo - add your API key)
EMAIL_PROVIDER=brevo
BREVO_API_KEY=your_brevo_api_key
# Alternative providers
RESEND_API_KEY=your_resend_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=your_aws_access_key
AWS_SES_SECRET_KEY=your_aws_secret_key

# Security (Auto-generated - CHANGE IN PRODUCTION)
JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}
RATE_LIMIT_REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SUBDOMAIN=admin
`

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists. Skipping creation.')
  console.log('   If you want to recreate it, delete the existing .env file first.')
} else {
  fs.writeFileSync(envPath, envContent)
  console.log('✅ .env file created successfully!')
  console.log('📝 Please update the placeholder values with your actual credentials.')
  console.log('🔐 Security keys (JWT_SECRET, ENCRYPTION_KEY) have been auto-generated.')
}
