import { NextRequest, NextResponse } from 'next/server'
import { processEmailRetryQueue } from '@/lib/services/email/worker'

/**
 * Cron endpoint for processing email retry queue
 * Should be called periodically (e.g., every 5 minutes)
 * 
 * Protected with API key in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.CRON_API_KEY

    if (!apiKey) {
      console.warn('CRON_API_KEY not configured, allowing request (not recommended for production)')
    } else {
      const providedKey = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('key')
      
      if (providedKey !== apiKey) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Process retry queue
    const result = await processEmailRetryQueue(50)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Email retry queue processing error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process email retry queue',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// Also support POST for webhook-style calls
export const POST = GET

