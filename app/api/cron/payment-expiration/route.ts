import { NextRequest, NextResponse } from 'next/server'
import { processExpiredPayments } from '@/lib/services/payments/expiration'

/**
 * Cron endpoint to process expired payments
 * Should be called periodically (e.g., every hour)
 * 
 * To secure this endpoint, add authentication:
 * - API key in headers
 * - Vercel Cron secret
 * - IP whitelist
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Process expired payments
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100')
    const result = await processExpiredPayments(limit)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      expired: result.expired,
      reverted: result.reverted,
    })
  } catch (error) {
    console.error('Error processing expired payments:', error)
    return NextResponse.json(
      {
        error: 'Failed to process expired payments',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// Also support GET for easier testing
export async function GET(request: NextRequest) {
  return POST(request)
}

