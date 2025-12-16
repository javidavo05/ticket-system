import { z } from 'zod'

// User schemas
export const userCreateSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
})

export const userUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
})

// Event schemas
export const eventCreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  eventType: z.enum(['concert', 'festival', 'conference', 'sports', 'theater', 'other']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isMultiDay: z.boolean().default(false),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  themeId: z.string().uuid().optional(),
})

export const eventUpdateSchema = eventCreateSchema.partial()

// Ticket type schemas
export const ticketTypeCreateSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  quantityAvailable: z.number().int().positive(),
  maxPerPurchase: z.number().int().positive().optional(),
  isMultiScan: z.boolean().default(false),
  maxScans: z.number().int().positive().optional(),
  saleStart: z.string().datetime().optional(),
  saleEnd: z.string().datetime().optional(),
})

// Purchase schemas
export const purchaseTicketsSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
  discountCode: z.string().optional(),
  guestInfo: z.object({
    email: z.string().email(),
    name: z.string().min(1),
  }).optional(),
})

// Payment schemas
export const paymentCreateSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().default('USD'),
  provider: z.enum(['yappy', 'paguelofacil', 'bank_transfer', 'wallet']),
  paymentMethod: z.enum(['card', 'transfer', 'qr', 'wallet']),
  items: z.array(z.object({
    ticketTypeId: z.string().uuid().optional(),
    itemType: z.enum(['ticket', 'wallet_reload', 'refund']),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    quantity: z.number().int().positive(),
  })),
})

// Wallet schemas
export const walletReloadSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.enum(['card', 'transfer', 'qr']),
})

// Discount schemas
export const discountCreateSchema = z.object({
  code: z.string().min(1).regex(/^[A-Z0-9-_]+$/),
  eventId: z.string().uuid().optional(),
  discountType: z.enum(['percentage', 'fixed_amount']),
  discountValue: z.string().regex(/^\d+(\.\d{1,2})?$/),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  minPurchaseAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
})

// Scan schemas
export const scanTicketSchema = z.object({
  ticketId: z.string().uuid(),
  qrSignature: z.string().min(1),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
})

// NFC schemas
export const nfcRegisterSchema = z.object({
  bandUid: z.string().min(1),
  eventId: z.string().uuid().optional(),
})

