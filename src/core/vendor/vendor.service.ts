
import { Types } from 'mongoose';
import { IVendor } from '../../models/interfaces';
import { Vendor } from '../../models/Vendor';

export class VendorService {
  /**
   * Criar um novo vendor
   */
  async createVendor(vendorData: Partial<IVendor>): Promise<IVendor> {
    try {
      const vendor = new Vendor(vendorData);
      return await vendor.save();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar vendor por ID
   */
  async getVendorById(vendorId: string): Promise<IVendor | null> {
    return await Vendor.findById(vendorId)
      .populate('owner', 'userId email phoneNumber')
      .exec();
  }

  /**
   * Buscar vendor por owner (dono)
   */
  async getVendorByOwner(ownerId: string): Promise<IVendor | null> {
    return await Vendor.findOne({ owner: new Types.ObjectId(ownerId) })
      .populate('owner', 'userId email phoneNumber')
      .exec();
  }

  /**
   * Listar todos os vendors com filtros
   */
  async getAllVendors(
    page: number = 1,
    limit: number = 10,
    filters: {
      type?: string;
      status?: string;
      city?: string;
      district?: string;
      open24h?: boolean;
      temporarilyClosed?: boolean;
    } = {}
  ): Promise<{
    vendors: IVendor[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Aplicar filtros
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.city) query['address.city'] = new RegExp(filters.city, 'i');
    if (filters.district) query['address.district'] = new RegExp(filters.district, 'i');
    if (filters.open24h !== undefined) query.open24h = filters.open24h;
    if (filters.temporarilyClosed !== undefined) query.temporarilyClosed = filters.temporarilyClosed;

    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .populate('owner', 'userId email phoneNumber')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Vendor.countDocuments(query)
    ]);

    return {
      vendors,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Buscar vendors por tipo
   */
  async getVendorsByType(type: 'restaurant' | 'pharmacy' | 'electronics' | 'service'): Promise<IVendor[]> {
    return await Vendor.find({ type, status: 'active' })
      .populate('owner', 'userId email phoneNumber')
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Buscar vendors ativos
   */
  async getActiveVendors(): Promise<IVendor[]> {
    return await Vendor.find({ 
      status: 'active', 
      temporarilyClosed: { $ne: true } 
    })
      .populate('owner', 'userId email phoneNumber')
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Buscar vendors por localização (cidade/distrito)
   */
  async getVendorsByLocation(city?: string, district?: string): Promise<IVendor[]> {
    const query: any = { status: 'active' };
    
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (district) {
      query['address.district'] = new RegExp(district, 'i');
    }

    return await Vendor.find(query)
      .populate('owner', 'userId email phoneNumber')
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Buscar vendors próximos por coordenadas
   */
  async getNearbyVendors(
    latitude: number, 
    longitude: number, 
    radiusInKm: number = 5
  ): Promise<IVendor[]> {
    // Converter km para graus (aproximadamente)
    const radiusInDegrees = radiusInKm / 111.32;

    return await Vendor.find({
      status: 'active',
      temporarilyClosed: { $ne: true },
      'address.coordinates.lat': {
        $gte: latitude - radiusInDegrees,
        $lte: latitude + radiusInDegrees
      },
      'address.coordinates.lng': {
        $gte: longitude - radiusInDegrees,
        $lte: longitude + radiusInDegrees
      }
    })
      .populate('owner', 'userId email phoneNumber')
      .exec();
  }

  /**
   * Atualizar vendor
   */
  async updateVendor(vendorId: string, updateData: Partial<IVendor>): Promise<IVendor | null> {
    return await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('owner', 'userId email phoneNumber');
  }

  /**
   * Deletar vendor
   */
  async deleteVendor(vendorId: string): Promise<boolean> {
    const result = await Vendor.findByIdAndDelete(vendorId);
    return !!result;
  }

  /**
   * Suspender vendor
   */
  async suspendVendor(vendorId: string): Promise<IVendor | null> {
    return await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { status: 'suspended' } },
      { new: true }
    ).populate('owner', 'userId email phoneNumber');
  }

  /**
   * Reativar vendor
   */
  async reactivateVendor(vendorId: string): Promise<IVendor | null> {
    return await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { status: 'active' } },
      { new: true }
    ).populate('owner', 'userId email phoneNumber');
  }

  /**
   * Fechar temporariamente
   */
  async closeTemporarily(vendorId: string, message?: string): Promise<IVendor | null> {
    const updateData: any = { temporarilyClosed: true };
    if (message) updateData.closedMessage = message;

    return await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: updateData },
      { new: true }
    ).populate('owner', 'userId email phoneNumber');
  }

  /**
   * Reabrir vendor
   */
  async reopenVendor(vendorId: string): Promise<IVendor | null> {
    return await Vendor.findByIdAndUpdate(
      vendorId,
      { 
        $set: { temporarilyClosed: false },
        $unset: { closedMessage: 1 }
      },
      { new: true }
    ).populate('owner', 'userId email phoneNumber');
  }

  /**
   * Atualizar horário de funcionamento
   */
  async updateWorkingHours(
    vendorId: string, 
    workingHours: Array<{
      day: number;
      open?: string;
      close?: string;
      active: boolean;
    }>
  ): Promise<IVendor | null> {
    return await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { workingHours } },
      { new: true }
    ).populate('owner', 'userId email phoneNumber');
  }

  /**
   * Adicionar/atualizar horário para um dia específico
   */
  async updateDayWorkingHour(
    vendorId: string,
    day: number,
    hourData: {
      open?: string;
      close?: string;
      active: boolean;
    }
  ): Promise<IVendor | null> {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return null;

    const existingHourIndex = vendor.workingHours.findIndex(wh => wh.day === day);
    
    if (existingHourIndex >= 0) {
      // Atualizar horário existente
      vendor.workingHours[existingHourIndex] = { day, ...hourData };
    } else {
      // Adicionar novo horário
      vendor.workingHours.push({ day, ...hourData });
    }

    return await vendor.save();
  }

  /**
   * Atualizar endereço
   */
  async updateAddress(
    vendorId: string,
    address: {
      street?: string;
      district?: string;
      city?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    }
  ): Promise<IVendor | null> {
    return await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { address } },
      { new: true }
    ).populate('owner', 'userId email phoneNumber');
  }

  /**
   * Verificar se vendor está aberto agora
   */
  async isVendorOpen(vendorId: string): Promise<{
    isOpen: boolean;
    reason?: string;
    nextOpenTime?: string;
  }> {
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      return { isOpen: false, reason: 'Vendor não encontrado' };
    }

    if (vendor.status !== 'active') {
      return { isOpen: false, reason: 'Vendor suspenso' };
    }

    if (vendor.temporarilyClosed) {
      return { 
        isOpen: false, 
        reason: vendor.closedMessage || 'Temporariamente fechado' 
      };
    }

    if (vendor.open24h) {
      return { isOpen: true };
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    const todayHours = vendor.workingHours.find(wh => wh.day === currentDay);
    
    if (!todayHours || !todayHours.active) {
      // Buscar próximo dia aberto
      const nextOpenDay = vendor.workingHours
        .filter(wh => wh.active && wh.open && wh.close)
        .find(wh => wh.day > currentDay) || 
        vendor.workingHours.filter(wh => wh.active && wh.open && wh.close)[0];
      
      return { 
        isOpen: false, 
        reason: 'Fechado hoje',
        nextOpenTime: nextOpenDay ? `Dia ${nextOpenDay.day} às ${nextOpenDay.open}` : undefined
      };
    }

    if (!todayHours.open || !todayHours.close) {
      return { isOpen: false, reason: 'Horários não definidos' };
    }

    const isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;
    
    return { 
      isOpen,
      reason: isOpen ? undefined : 'Fora do horário de funcionamento',
      nextOpenTime: !isOpen ? `${todayHours.open}` : undefined
    };
  }

  /**
   * Buscar por nome (busca parcial)
   */
  async searchVendorsByName(name: string): Promise<IVendor[]> {
    return await Vendor.find({
      name: new RegExp(name, 'i'),
      status: 'active'
    })
      .populate('owner', 'userId email phoneNumber')
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Contar vendors por tipo
   */
  async countVendorsByType(): Promise<{
    restaurant: number;
    pharmacy: number;
    electronics: number;
    service: number;
    total: number;
  }> {
    const [restaurant, pharmacy, electronics, service] = await Promise.all([
      Vendor.countDocuments({ type: 'restaurant', status: 'active' }),
      Vendor.countDocuments({ type: 'pharmacy', status: 'active' }),
      Vendor.countDocuments({ type: 'electronics', status: 'active' }),
      Vendor.countDocuments({ type: 'service', status: 'active' })
    ]);

    return {
      restaurant,
      pharmacy,
      electronics,
      service,
      total: restaurant + pharmacy + electronics + service
    };
  }

  /**
   * Contar vendors por status
   */
  async countVendorsByStatus(): Promise<{
    active: number;
    suspended: number;
    temporarilyClosed: number;
  }> {
    const [active, suspended, temporarilyClosed] = await Promise.all([
      Vendor.countDocuments({ status: 'active', temporarilyClosed: { $ne: true } }),
      Vendor.countDocuments({ status: 'suspended' }),
      Vendor.countDocuments({ temporarilyClosed: true })
    ]);

    return { active, suspended, temporarilyClosed };
  }

  /**
   * Verificar se vendor existe
   */
  async vendorExists(vendorId: string): Promise<boolean> {
    const vendor = await Vendor.findById(vendorId);
    return !!vendor;
  }
}