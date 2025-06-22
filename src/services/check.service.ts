import { Request, Response } from 'express';
import { clerkClient } from "@clerk/clerk-sdk-node"

export async function isCompleteAccount(req: Request, res: Response): Promise<any> {
    
    const userId =  req.clerkPayload?.sub as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    try {
      const user = await clerkClient.users.getUser(userId);
      
      // Verificar se o usuário tem unsafeMetadata e se profileCompleted é true
      const unsafeMetadata = user.unsafeMetadata as any;
      const isComplete: boolean = Boolean(
        unsafeMetadata && 
        unsafeMetadata.profileCompleted === true && 
        unsafeMetadata.phoneNumber
      );
console.log({
    success: true,
        isComplete
})
      return res.status(200).json({
        success: true,
        isComplete
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao verificar conta',
        error: error.message
      });
    }
  }