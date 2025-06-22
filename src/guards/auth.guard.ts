import { Request, Response, NextFunction } from "express"
import { clerkClient } from "@clerk/clerk-sdk-node"
import { logger } from "../utils/logger"


export const AuthGuard = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers.authorization

    console.log('TOKEN: ', authHeader)

    if (!authHeader) {
      console.log( "No authorization header")
      return res.status(401).json({ error: "No authorization header" })
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
      console.log( "No authorization header TOKEN")
      return res.status(401).json({ error: "No token provided" })
    }

    // Verificar token com Clerk
    const tokenPayload = await clerkClient.verifyToken(token)
    const user = await clerkClient.users.getUser(tokenPayload.sub)

    if (!user) {
      console.log('jaimeinoque20@gmail.com')
      return res.status(401).json({ error: "User not found" })
    }

   console.log('USER_ID: ',tokenPayload.sub)

    // Adicionar informações adicionais ao clerkPayload
    req.clerkPayload = {
      sub: tokenPayload.sub as string,
      azp: tokenPayload.azp as string,
      exp: tokenPayload.exp as number,
      fva: tokenPayload.fva as [number, number],
      iat: tokenPayload.iat as number,
      iss: tokenPayload.iss as string,
      nbf: tokenPayload.nbf,
      sid: tokenPayload.sid,
      org_id: tokenPayload.org_id,
      org_role: tokenPayload.org_role,
      org_slug: tokenPayload.org_slug,
      org_permissions: tokenPayload.org_permissions,
      isPremium: user.unsafeMetadata?.isPremium as boolean,
      tier: user.unsafeMetadata?.tier as 'free' | 'pro' | 'business',
      expiresAt: user.unsafeMetadata?.expiresAt as string | null,
      nextBillingDate: user.unsafeMetadata?.nextBillingDate as string | null
    }

    next()
  } catch (error) {
    console.log(error)
    logger.error("Auth error:", error)
    return res.status(401).json({ error: "Invalid token" })
  }
}