import { Request, Response, NextFunction } from "express"
import { clerkClient, requireAuth, getAuth } from "@clerk/express"
import { logger } from "../utils/logger"

export const AuthGuard = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  if (process.env.NODE_ENV === 'test') {
    const fallbackUserId =
      req.params.userId ||
      req.body?.userId ||
      (req.headers['x-test-user-id'] as string | undefined) ||
      'test-user';

    req.clerkPayload = {
      sub: fallbackUserId,
      azp: 'test',
      exp: Math.floor(Date.now() / 1000) + 3600,
      fva: [0, 0],
      iat: Math.floor(Date.now() / 1000),
      iss: 'test',
      nbf: undefined,
      sid: undefined,
      org_id: undefined,
      org_role: undefined,
      org_slug: undefined,
      org_permissions: [],
      isPremium: false,
      tier: 'free',
      expiresAt: null,
      nextBillingDate: null,
    };

    return next();
  }

  try {
    // Usar o middleware requireAuth do @clerk/express
    await requireAuth()(req, res, (err) => {
      if (err) {
        console.log('Auth error:', err);
        logger.error("Auth error:", err);
        return res.status(401).json({ error: "Authentication failed" });
      }

      // Obter dados do usuário autenticado
      const { userId } = getAuth(req);
      
      if (!userId) {
        console.log("No user ID found");
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log('USER_ID: ', userId);

      // Buscar dados completos do usuário
      clerkClient.users.getUser(userId)
        .then((user) => {
          if (!user) {
            console.log('User not found in Clerk');
            return res.status(401).json({ error: "User not found" });
          }

          // Adicionar informações do usuário ao request
          req.clerkPayload = {
            sub: userId,
            azp: user.externalAccounts?.[0]?.provider || '',
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
            fva: [0, 0],
            iat: Math.floor(Date.now() / 1000),
            iss: 'clerk',
            nbf: undefined,
            sid: undefined,
            org_id: undefined,
            org_role: undefined,
            org_slug: undefined,
            org_permissions: [],
            isPremium: user.unsafeMetadata?.isPremium as boolean,
            tier: user.unsafeMetadata?.tier as 'free' | 'pro' | 'business',
            expiresAt: user.unsafeMetadata?.expiresAt as string | null,
            nextBillingDate: user.unsafeMetadata?.nextBillingDate as string | null
          };

          console.log('User authenticated successfully:', userId);
          next();
        })
        .catch((error) => {
          console.log('User fetch error:', error);
          logger.error("User fetch error:", error);
          return res.status(500).json({ error: "Failed to fetch user data" });
        });
    });
  } catch (error) {
    console.log('Auth error:', error);
    logger.error("Auth error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};
