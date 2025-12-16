# Production Ticketing System

A production-grade, security-first ticketing and cashless system built with Next.js, Supabase, and designed for 50,000+ daily transactions.

## Features

- **Multi-tenant, re-brandable frontend** with database-driven theming
- **Payment gateway abstraction** supporting Yappy, PagueloFacil, and bank transfers
- **Cryptographically signed QR codes** for ticket validation
- **NFC band support** for cashless payments and access control
- **Role-based access control** with Row Level Security (RLS)
- **Comprehensive audit logging** for all financial and access events
- **PWA scanner app** with offline support
- **Wallet system** for cashless transactions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth + Google OAuth
- **ORM**: Drizzle ORM
- **Email**: Brevo (formerly Sendinblue)
- **Hosting**: Vercel (Phase 1)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Environment variables configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Fill in your Supabase and payment provider credentials
```

3. Run database migrations:
```bash
# Connect to your Supabase database and run:
psql $DATABASE_URL -f lib/db/migrations/001_initial_schema.sql
psql $DATABASE_URL -f lib/db/migrations/002_rls_policies.sql
```

4. Start development server:
```bash
npm run dev
```

## Project Structure

- `app/` - Next.js App Router pages
- `lib/` - Core business logic and services
- `server-actions/` - Server actions for RSC
- `components/` - React components
- `lib/db/` - Database schema and migrations
- `lib/services/` - Business logic services
- `lib/security/` - Security utilities

## Security Features

- Zero trust architecture
- Server-side validation only
- Strict Row Level Security (RLS)
- Cryptographically signed QR codes
- Idempotent payment flows
- Rate limiting
- Audit logging
- CSRF protection

## Deployment

See `vercel.json` for Vercel deployment configuration.

## License

Proprietary - All rights reserved

