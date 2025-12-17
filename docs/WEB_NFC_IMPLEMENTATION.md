# Web NFC Implementation

Complete implementation of Web NFC tag reading and writing for NFC band binding in the PWA.

## Overview

This implementation enables NFC tag reading and writing directly from the PWA using the Web NFC API (Chrome Android 89+), without requiring native apps. The system provides a fast 3-step binding flow optimized for high-throughput festival environments.

## Architecture

### Flow

1. **Prepare**: Operator opens binding screen → System requests binding token from server
2. **Read**: Operator taps NFC band on phone → System reads tag and detects state
3. **Write & Confirm**: System writes secure payload → Confirms binding server-side

### Components

**Core Services:**
- `lib/nfc/web-nfc.ts` - Web NFC API abstraction
- `lib/nfc/payload.ts` - Payload encoding/decoding (70 bytes, NTAG213 compatible)
- `lib/nfc/binding-flow.ts` - 3-step binding orchestration
- `lib/nfc/errors.ts` - NFC-specific error types
- `lib/nfc/types.ts` - TypeScript type definitions

**API Endpoints:**
- `POST /api/nfc/bind/prepare` - Generate binding token
- `POST /api/nfc/bind/sign-payload` - Sign payload server-side
- `POST /api/nfc/bind/complete` - Complete binding and generate security token
- `POST /api/nfc/verify-payload` - Verify payload signature

**UI Components:**
- `components/nfc/binding-screen.tsx` - Main binding UI
- `components/nfc/nfc-status.tsx` - NFC support indicator
- `components/nfc/binding-steps.tsx` - Step indicator

**Pages:**
- `app/admin/nfc/bind/page.tsx` - Binding page

## Security Model

### Binding Token
- **Lifetime**: 5 minutes
- **Usage**: One-time use (invalidated after binding)
- **Generation**: Cryptographically random 32 bytes
- **Storage**: Database table `binding_tokens` with expiration

### Payload Signature
- **Algorithm**: HMAC-SHA256
- **Secret**: Server-side only (JWT_SECRET or ENCRYPTION_KEY)
- **Generation**: Server-side via `/api/nfc/bind/sign-payload`
- **Verification**: Server-side via `/api/nfc/verify-payload`

### Anti-Cloning
- Server tracks band UID
- Detects concurrent use
- Location-based validation
- Rate limiting

## Payload Format

**Size**: 70 bytes (fits in NTAG213 tags)

**Structure:**
```
Offset  Size    Field
0       1       Version (0x01)
1       1       Flags
2       32      Token (base64 encoded, 32 bytes)
34      4       Expiration (uint32, big-endian)
38      32      Signature (HMAC-SHA256, hex)
```

**Flags:**
- Bit 0: Bound (1) / Unbound (0)
- Bit 1: Expired (1) / Valid (0)
- Bits 2-7: Reserved

## Database Schema

### binding_tokens Table

```sql
CREATE TABLE binding_tokens (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- Users can only view their own tokens
- Users can create their own tokens
- No UPDATE/DELETE policies (server-only operations)

## Usage

### For Operators

1. Navigate to `/admin/nfc/bind`
2. Click "Comenzar Vinculación"
3. Tap NFC band on phone when prompted
4. Wait for confirmation

### For Developers

**Check NFC Support:**
```typescript
import { WebNFCService } from '@/lib/nfc/web-nfc'

if (WebNFCService.isSupported()) {
  // NFC available
}
```

**Read Tag:**
```typescript
const result = await NFCBindingFlow.readTag()
// Returns: { uid?, payload?, state: 'unbound' | 'bound' | 'invalid' | 'expired' }
```

**Complete Binding:**
```typescript
const result = await NFCBindingFlow.completeFlow(userId)
// Returns: { success: true, bandId, securityToken }
```

## Error Handling

All errors are user-friendly and recoverable:

- **NFC Not Supported**: Shows message, disables binding
- **NFC Disabled**: Prompts to enable NFC
- **User Cancels**: Returns to ready state, allows retry
- **Write Failure**: Shows error, allows retry
- **Tag Already Bound**: Shows message, prevents binding
- **Token Expired**: Auto-retries with new token
- **Network Error**: Shows message, allows retry when online

## Performance

- **Total Binding Time**: < 2 seconds (target)
- **Network Calls**: 2 (prepare + complete)
- **No Network During Read/Write**: Operations are local
- **Minimal UI Blocking**: Async operations with loading states

## Browser Support

- **Primary**: Chrome Android 89+
- **Secondary**: Edge Android 89+
- **Limited**: Samsung Internet
- **Not Supported**: iOS, Desktop browsers

## Testing

Use `lib/nfc/test-utils.ts` for mocking:

```typescript
import { MockWebNFC, createTestPayload } from '@/lib/nfc/test-utils'

// Set mock tag
MockWebNFC.setMockTag(createTestPayload())

// Test binding flow
const result = await NFCBindingFlow.completeFlow(userId)
```

## Migration

Run database migrations:

```bash
psql "$DIRECT_URL" -f lib/db/migrations/027_binding_tokens.sql
psql "$DIRECT_URL" -f lib/db/migrations/028_binding_tokens_rls.sql
```

## Security Considerations

1. **Never store user IDs on tags** - Only tokens
2. **Server-side signature generation** - Client cannot forge signatures
3. **Token expiration** - Short-lived tokens prevent replay
4. **One-time use tokens** - Prevent token reuse
5. **Payload verification** - Server validates all payloads
6. **Anti-cloning detection** - Server tracks band usage

## Troubleshooting

**NFC not working:**
- Verify Chrome Android 89+
- Check NFC is enabled in device settings
- Ensure user gesture (button click) initiated operation

**Binding fails:**
- Check network connection
- Verify token hasn't expired
- Check tag is writable
- Verify tag isn't already bound

**Signature verification fails:**
- Ensure JWT_SECRET matches on server
- Check payload wasn't tampered with
- Verify token format is correct

## Future Enhancements

- Offline binding support (queue for later)
- Batch binding (multiple tags)
- Unbind flow
- Tag status checking
- NFC payment integration
