"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorController = void 0;
const vendor_service_1 = require("./vendor.service");
const User_1 = require("../../models/User");
const logger_1 = require("../../utils/logger");
class VendorController {
    constructor() {
        this.getVendorStatsByStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const stats = yield this.vendorService.getVendorStatsByStatus(id);
                res.status(200).json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor stats by status:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar estatísticas do vendor'
                });
            }
        });
        /**
         * GET /vendors/my-vendor - Buscar vendor do usuário autenticado
         */
        this.getMyVendor = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
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
                const vendor = yield this.vendorService.getVendorByOwner(user._id.toString());
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
            }
            catch (error) {
                logger_1.logger.error('Error fetching my vendor:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar vendor'
                });
            }
        });
        /**
         * GET /vendors/my-balance - Ver saldo do vendor autenticado
         */
        this.getMyBalance = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
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
                const vendor = yield this.vendorService.getVendorByOwner(user._id.toString());
                if (!vendor || !vendor._id) {
                    res.status(404).json({
                        success: false,
                        message: 'Vendor não encontrado para este usuário'
                    });
                    return;
                }
                const { startDate, endDate } = req.query;
                const balance = yield this.vendorService.getVendorBalance(vendor._id.toString(), startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
                res.status(200).json({
                    success: true,
                    data: balance
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor balance:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar saldo do vendor'
                });
            }
        });
        /**
         * PUT /vendors/my-vendor - Atualizar vendor do usuário autenticado
         */
        this.updateMyVendor = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
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
                const vendor = yield this.vendorService.getVendorByOwner(user._id.toString());
                if (!vendor) {
                    res.status(404).json({
                        success: false,
                        message: 'Vendor não encontrado para este usuário'
                    });
                    return;
                }
                const updateData = req.body;
                const updatedVendor = yield this.vendorService.updateVendor(vendor._id.toString(), updateData);
                res.status(200).json({
                    success: true,
                    message: 'Vendor atualizado com sucesso',
                    data: updatedVendor
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating my vendor:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar vendor'
                });
            }
        });
        this.vendorService = new vendor_service_1.VendorService();
    }
    /**
     * Criar um novo vendor
     */
    createVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const vendorData = req.body;
                const vendor = yield this.vendorService.createVendor(vendorData);
                res.status(201).json({
                    success: true,
                    message: 'Vendor criado com sucesso',
                    data: vendor
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Erro ao criar vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Buscar vendor por ID
     */
    getVendorById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const vendor = yield this.vendorService.getVendorById(id);
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Buscar vendor por owner
     */
    getVendorByOwner(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { ownerId } = req.params;
                const vendor = yield this.vendorService.getVendorByOwner(ownerId);
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar vendor por proprietário',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Listar todos os vendors com paginação e filtros
     */
    getAllVendors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const filters = {
                    type: req.query.type,
                    status: req.query.status,
                    city: req.query.city,
                    district: req.query.district,
                    open24h: req.query.open24h ? req.query.open24h === 'true' : undefined,
                    temporarilyClosed: req.query.temporarilyClosed ? req.query.temporarilyClosed === 'true' : undefined
                };
                const result = yield this.vendorService.getAllVendors(page, limit, filters);
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao listar vendors',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Buscar vendors por tipo
     */
    getVendorsByType(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { type } = req.params;
                if (!['restaurant', 'pharmacy', 'electronics', 'service'].includes(type)) {
                    res.status(400).json({
                        success: false,
                        message: 'Tipo de vendor inválido'
                    });
                    return;
                }
                const vendors = yield this.vendorService.getVendorsByType(type);
                res.status(200).json({
                    success: true,
                    data: vendors
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar vendors por tipo',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Buscar vendors ativos
     */
    getActiveVendors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const vendors = yield this.vendorService.getActiveVendors();
                res.status(200).json({
                    success: true,
                    data: vendors
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar vendors ativos',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Buscar vendors por localização
     */
    getVendorsByLocation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { city, district } = req.query;
                const vendors = yield this.vendorService.getVendorsByLocation(city, district);
                res.status(200).json({
                    success: true,
                    data: vendors
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar vendors por localização',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Buscar vendors próximos por coordenadas
     */
    getNearbyVendors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { latitude, longitude, radius } = req.query;
                if (!latitude || !longitude) {
                    res.status(400).json({
                        success: false,
                        message: 'Latitude e longitude são obrigatórias'
                    });
                    return;
                }
                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);
                const radiusInKm = radius ? parseFloat(radius) : 5;
                const vendors = yield this.vendorService.getNearbyVendors(lat, lng, radiusInKm);
                res.status(200).json({
                    success: true,
                    data: vendors
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar vendors próximos',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Atualizar vendor
     */
    updateVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const vendor = yield this.vendorService.updateVendor(id, updateData);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Erro ao atualizar vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Deletar vendor
     */
    deleteVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const deleted = yield this.vendorService.deleteVendor(id);
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao deletar vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Suspender vendor
     */
    suspendVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const vendor = yield this.vendorService.suspendVendor(id);
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao suspender vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Reativar vendor
     */
    reactivateVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const vendor = yield this.vendorService.reactivateVendor(id);
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao reativar vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Fechar temporariamente
     */
    closeTemporarily(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { message } = req.body;
                const vendor = yield this.vendorService.closeTemporarily(id, message);
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao fechar vendor temporariamente',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Reabrir vendor
     */
    reopenVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const vendor = yield this.vendorService.reopenVendor(id);
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao reabrir vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Atualizar horário de funcionamento
     */
    updateWorkingHours(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const vendor = yield this.vendorService.updateWorkingHours(id, workingHours);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Erro ao atualizar horários',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Atualizar horário para um dia específico
     */
    updateDayWorkingHour(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const vendor = yield this.vendorService.updateDayWorkingHour(id, day, {
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Erro ao atualizar horário do dia',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Atualizar endereço
     */
    updateAddress(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const addressData = req.body;
                const vendor = yield this.vendorService.updateAddress(id, addressData);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Erro ao atualizar endereço',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Verificar se vendor está aberto
     */
    isVendorOpen(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const result = yield this.vendorService.isVendorOpen(id);
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao verificar status do vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Buscar vendors por nome
     */
    searchVendorsByName(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name } = req.query;
                if (!name) {
                    res.status(400).json({
                        success: false,
                        message: 'Nome é obrigatório para a busca'
                    });
                    return;
                }
                const vendors = yield this.vendorService.searchVendorsByName(name);
                res.status(200).json({
                    success: true,
                    data: vendors
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar vendors por nome',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Estatísticas - contar vendors por tipo
     */
    countVendorsByType(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.vendorService.countVendorsByType();
                res.status(200).json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar estatísticas por tipo',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Estatísticas - contar vendors por status
     */
    countVendorsByStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.vendorService.countVendorsByStatus();
                res.status(200).json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar estatísticas por status',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
    /**
     * Verificar se vendor existe
     */
    vendorExists(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const exists = yield this.vendorService.vendorExists(id);
                res.status(200).json({
                    success: true,
                    data: { exists }
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao verificar existência do vendor',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        });
    }
}
exports.VendorController = VendorController;
