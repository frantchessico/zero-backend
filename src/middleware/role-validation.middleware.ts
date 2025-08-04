import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Vendor } from '../models/Vendor';
import { Delivery } from '../models/Delivery';
import { logger } from '../utils/logger';

/**
 * Middleware para validar se o usuário tem role adequado para criar vendor
 */
export const validateVendorRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner } = req.body;
    
    if (owner) {
      const user = await User.findById(owner);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      if (user.role !== 'vendor') {
        return res.status(403).json({
          success: false,
          message: 'Apenas usuários com role "vendor" podem criar estabelecimentos'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Usuário inativo não pode criar estabelecimentos'
        });
      }

      // Verificar se já existe vendor para este usuário
      const existingVendor = await Vendor.findOne({ owner });
      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: 'Usuário já possui um estabelecimento registrado'
        });
      }

      logger.info(`Vendor creation validated for user ${owner}`);
    }

    next();
  } catch (error) {
    logger.error('Error validating vendor role:', error);
    next(error);
  }
};

/**
 * Middleware para validar se o usuário tem role adequado para ser driver
 */
export const validateDriverRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driver } = req.body;
    
    if (driver) {
      const user = await User.findById(driver);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      if (user.role !== 'driver') {
        return res.status(403).json({
          success: false,
          message: 'Apenas usuários com role "driver" podem fazer entregas'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Motorista inativo não pode fazer entregas'
        });
      }

      logger.info(`Driver role validated for user ${driver}`);
    }

    next();
  } catch (error) {
    logger.error('Error validating driver role:', error);
    next(error);
  }
};

/**
 * Middleware para validar se o usuário tem role adequado para fazer pedidos
 */
export const validateCustomerRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customer } = req.body;
    
    if (customer) {
      const user = await User.findById(customer);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      if (user.role !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Apenas usuários com role "customer" podem fazer pedidos'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Cliente inativo não pode fazer pedidos'
        });
      }

      logger.info(`Customer role validated for user ${customer}`);
    }

    next();
  } catch (error) {
    logger.error('Error validating customer role:', error);
    next(error);
  }
};

/**
 * Middleware para validar relacionamento vendor-product
 */
export const validateVendorProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendor } = req.body;
    
    if (vendor) {
      const vendorDoc = await Vendor.findById(vendor);
      
      if (!vendorDoc) {
        return res.status(404).json({
          success: false,
          message: 'Estabelecimento não encontrado'
        });
      }

      if (vendorDoc.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Estabelecimento inativo não pode ter produtos'
        });
      }

      if (vendorDoc.temporarilyClosed) {
        return res.status(403).json({
          success: false,
          message: 'Estabelecimento temporariamente fechado'
        });
      }

      logger.info(`Vendor-product relationship validated for vendor ${vendor}`);
    }

    next();
  } catch (error) {
    logger.error('Error validating vendor-product relationship:', error);
    next(error);
  }
};

/**
 * Middleware para validar relacionamento order-vendor
 */
export const validateOrderVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendor } = req.body;
    
    if (vendor) {
      const vendorDoc = await Vendor.findById(vendor);
      
      if (!vendorDoc) {
        return res.status(404).json({
          success: false,
          message: 'Estabelecimento não encontrado'
        });
      }

      if (vendorDoc.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Estabelecimento inativo não aceita pedidos'
        });
      }

      if (vendorDoc.temporarilyClosed) {
        return res.status(403).json({
          success: false,
          message: 'Estabelecimento temporariamente fechado'
        });
      }

      // Verificar horário de funcionamento
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);

      const workingHour = vendorDoc.workingHours.find(wh => wh.day === currentDay);
      
      if (!vendorDoc.open24h && workingHour) {
        if (!workingHour.active || 
            (workingHour.open && currentTime < workingHour.open) ||
            (workingHour.close && currentTime > workingHour.close)) {
          return res.status(403).json({
            success: false,
            message: 'Estabelecimento fechado neste horário'
          });
        }
      }

      logger.info(`Order-vendor relationship validated for vendor ${vendor}`);
    }

    next();
  } catch (error) {
    logger.error('Error validating order-vendor relationship:', error);
    next(error);
  }
};

/**
 * Middleware para validar se delivery pode ser atribuída ao driver
 */
export const validateDeliveryDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driver } = req.body;
    
    if (driver) {
      const user = await User.findById(driver);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Motorista não encontrado'
        });
      }

      if (user.role !== 'driver') {
        return res.status(403).json({
          success: false,
          message: 'Apenas motoristas podem fazer entregas'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Motorista inativo não pode fazer entregas'
        });
      }

      // Verificar se driver já tem delivery em andamento
      const activeDelivery = await Delivery.findOne({
        driver,
        status: { $in: ['picked_up', 'in_transit'] }
      });

      if (activeDelivery) {
        return res.status(400).json({
          success: false,
          message: 'Motorista já possui entrega em andamento'
        });
      }

      logger.info(`Delivery-driver relationship validated for driver ${driver}`);
    }

    next();
  } catch (error) {
    logger.error('Error validating delivery-driver relationship:', error);
    next(error);
  }
};

/**
 * Middleware para validar mudança de role
 */
export const validateRoleChange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (role && userId) {
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Validar transições de role permitidas
      const allowedTransitions = {
        'customer': ['driver', 'vendor'],
        'driver': ['customer'],
        'vendor': ['customer']
      };

      const currentRole = user.role;
      const newRole = role;

      if (currentRole !== newRole) {
        const allowedRoles = allowedTransitions[currentRole as keyof typeof allowedTransitions];
        
        if (!allowedRoles || !allowedRoles.includes(newRole as any)) {
          return res.status(400).json({
            success: false,
            message: `Transição de role não permitida: ${currentRole} → ${newRole}`
          });
        }

        // Validações específicas por role
        if (newRole === 'vendor') {
          const existingVendor = await Vendor.findOne({ owner: userId });
          if (existingVendor) {
            return res.status(400).json({
              success: false,
              message: 'Usuário já possui estabelecimento'
            });
          }
        }

        logger.info(`Role change validated: ${currentRole} → ${newRole} for user ${userId}`);
      }
    }

    next();
  } catch (error) {
    logger.error('Error validating role change:', error);
    next(error);
  }
}; 