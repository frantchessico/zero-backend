import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      clerkPayload?: {
        sub: string
        azp: string
        exp: number
        fva: [number, number]
        iat: number
        iss: string
        nbf?: number
        sid?: string
        org_id?: string
        org_role?: string
        org_slug?: string
        org_permissions?: string[]
        isPremium?: boolean
        tier?: 'free' | 'pro' | 'business'
        expiresAt?: string | null
        nextBillingDate?: string | null
      }
    }
  }
} 