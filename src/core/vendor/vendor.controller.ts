import { Request, Response } from 'express';
import { VendorService } from './vendor.service';
import { User } from '../../models/User';
import { IVendor } from '../../models/interfaces';
import { logger } from '../../utils/logger';

export class VendorController {
  getVendorStatsByStatus(arg0: string, getVendorStatsByStatus: any) {
      throw new Error('Method not implemented.');
  }
  private vendorService: VendorService;

  constructor() {
    this.vendorService = new VendorService();
  }

  /**
   * GET /vendors/my-vendor - Buscar vendor do usuário autenticado
   */
  getMyVendor = async (req: Request, res: Response): Promise<void> => {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem acessar esta funcionalidade'
        });
        return;
      }

      const vendor = await this.vendorService.getVendorByOwner(user._id.toString());
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este usuário'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: vendor
      });
    } catch (error: any) {
      logger.error('Error fetching my vendor:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar vendor'
      });
    }
  };

  /**
   * PUT /vendors/my-vendor - Atualizar vendor do usuário autenticado
   */
  updateMyVendor = async (req: Request, res: Response): Promise<void> => {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem acessar esta funcionalidade'
        });
        return;
      }

      const vendor = await this.vendorService.getVendorByOwner(user._id.toString());
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este usuário'
        });
        return;
      }

      const updateData = req.body;
      const updatedVendor = await this.vendorService.updateVendor(vendor._id!.toString(), updateData);

      res.status(200).json({
        success: true,
        message: 'Vendor atualizado com sucesso',
        data: updatedVendor
      });
    } catch (error: any) {
      logger.error('Error updating my vendor:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar vendor'
      });
    }
  };

  /**
   * Criar um novo vendor
   */
  async createVendor(req: Request, res: Response): Promise<void> {
    try {
      const vendorData: Partial<IVendor> = req.body;
      const vendor = await this.vendorService.createVendor(vendorData);
      
      res.status(201).json({
        success: true,
        message: 'Vendor criado com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Erro ao criar vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar vendor por ID
   */
  async getVendorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vendor = await this.vendorService.getVendorById(id);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar vendor por owner
   */
  async getVendorByOwner(req: Request, res: Response): Promise<void> {
    try {
      const { ownerId } = req.params;
      const vendor = await this.vendorService.getVendorByOwner(ownerId);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este proprietário'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendor por proprietário',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Listar todos os vendors com paginação e filtros
   */
  async getAllVendors(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters = {
        type: req.query.type as string,
        status: req.query.status as string,
        city: req.query.city as string,
        district: req.query.district as string,
        open24h: req.query.open24h ? req.query.open24h === 'true' : undefined,
        temporarilyClosed: req.query.temporarilyClosed ? req.query.temporarilyClosed === 'true' : undefined
      };

      const result = await this.vendorService.getAllVendors(page, limit, filters);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao listar vendors',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar vendors por tipo
   */
  async getVendorsByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      
      if (!['restaurant', 'pharmacy', 'electronics', 'service'].includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Tipo de vendor inválido'
        });
        return;
      }

      const vendors = await this.vendorService.getVendorsByType(type as any);
      
      res.status(200).json({
        success: true,
        data: vendors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendors por tipo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar vendors ativos
   */
  async getActiveVendors(req: Request, res: Response): Promise<void> {
    try {
      const vendors = await this.vendorService.getActiveVendors();
      
      res.status(200).json({
        success: true,
        data: vendors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendors ativos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar vendors por localização
   */
  async getVendorsByLocation(req: Request, res: Response): Promise<void> {
    try {
      const { city, district } = req.query;
      const vendors = await this.vendorService.getVendorsByLocation(
        city as string, 
        district as string
      );
      
      res.status(200).json({
        success: true,
        data: vendors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendors por localização',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar vendors próximos por coordenadas
   */
  async getNearbyVendors(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          message: 'Latitude e longitude são obrigatórias'
        });
        return;
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInKm = radius ? parseFloat(radius as string) : 5;

      const vendors = await this.vendorService.getNearbyVendors(lat, lng, radiusInKm);
      
      res.status(200).json({
        success: true,
        data: vendors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendors próximos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualizar vendor
   */
  async updateVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: Partial<IVendor> = req.body;
      
      const vendor = await this.vendorService.updateVendor(id, updateData);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vendor atualizado com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Deletar vendor
   */
  async deleteVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.vendorService.deleteVendor(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vendor deletado com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Suspender vendor
   */
  async suspendVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vendor = await this.vendorService.suspendVendor(id);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vendor suspenso com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao suspender vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Reativar vendor
   */
  async reactivateVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vendor = await this.vendorService.reactivateVendor(id);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vendor reativado com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao reativar vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Fechar temporariamente
   */
  async closeTemporarily(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      const vendor = await this.vendorService.closeTemporarily(id, message);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vendor fechado temporariamente',
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao fechar vendor temporariamente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Reabrir vendor
   */
  async reopenVendor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vendor = await this.vendorService.reopenVendor(id);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vendor reaberto com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao reabrir vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualizar horário de funcionamento
   */
  async updateWorkingHours(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workingHours } = req.body;
      
      if (!Array.isArray(workingHours)) {
        res.status(400).json({
          success: false,
          message: 'workingHours deve ser um array'
        });
        return;
      }

      const vendor = await this.vendorService.updateWorkingHours(id, workingHours);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Horários atualizados com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar horários',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualizar horário para um dia específico
   */
  async updateDayWorkingHour(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { day, open, close, active } = req.body;
      
      if (typeof day !== 'number' || day < 0 || day > 6) {
        res.status(400).json({
          success: false,
          message: 'Dia deve ser um número entre 0 (domingo) e 6 (sábado)'
        });
        return;
      }

      const vendor = await this.vendorService.updateDayWorkingHour(id, day, {
        open,
        close,
        active: active !== undefined ? active : true
      });
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Horário do dia atualizado com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar horário do dia',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualizar endereço
   */
  async updateAddress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const addressData = req.body;
      
      const vendor = await this.vendorService.updateAddress(id, addressData);
      
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Endereço atualizado com sucesso',
        data: vendor
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Erro ao atualizar endereço',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Verificar se vendor está aberto
   */
  async isVendorOpen(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.vendorService.isVendorOpen(id);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar status do vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Buscar vendors por nome
   */
  async searchVendorsByName(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.query;
      
      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Nome é obrigatório para a busca'
        });
        return;
      }

      const vendors = await this.vendorService.searchVendorsByName(name as string);
      
      res.status(200).json({
        success: true,
        data: vendors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendors por nome',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Estatísticas - contar vendors por tipo
   */
  async countVendorsByType(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.vendorService.countVendorsByType();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas por tipo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Estatísticas - contar vendors por status
   */
  async countVendorsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.vendorService.countVendorsByStatus();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas por status',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Verificar se vendor existe
   */
  async vendorExists(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const exists = await this.vendorService.vendorExists(id);
      
      res.status(200).json({
        success: true,
        data: { exists }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar existência do vendor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}