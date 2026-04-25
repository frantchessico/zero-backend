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
exports.DriverController = void 0;
const driver_service_1 = require("./driver.service");
const User_1 = require("../../models/User");
const logger_1 = require("../../utils/logger");
const delivery_tracking_service_1 = require("../delivery/delivery-tracking.service");
class DriverController {
    constructor() {
        /**
         * GET /drivers/my-profile - Buscar perfil do driver autenticado
         */
        this.getMyDriverProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                if (user.role !== 'driver') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas drivers podem acessar esta funcionalidade'
                    });
                    return;
                }
                const driver = yield this.driverService.getDriverByUserId(user._id.toString());
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: driver
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching my driver profile:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar perfil de driver'
                });
            }
        });
        /**
         * PUT /drivers/my-profile - Atualizar perfil do driver autenticado
         */
        this.updateMyDriverProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                if (user.role !== 'driver') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas drivers podem acessar esta funcionalidade'
                    });
                    return;
                }
                const driver = yield this.driverService.getDriverByUserId(user._id.toString());
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                const updateData = req.body;
                const updatedDriver = yield this.driverService.updateDriver(driver._id.toString(), updateData);
                res.status(200).json({
                    success: true,
                    message: 'Perfil de driver atualizado com sucesso',
                    data: updatedDriver
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating my driver profile:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar perfil de driver'
                });
            }
        });
        /**
         * GET /drivers/my-earnings - Ganhos do driver autenticado
         */
        this.getMyEarnings = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                if (user.role !== 'driver') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas drivers podem ver ganhos'
                    });
                    return;
                }
                const driver = yield this.driverService.getDriverByUserId(user._id.toString());
                if (!driver || !driver._id) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                const { startDate, endDate } = req.query;
                const earnings = yield this.driverService.getDriverEarnings(driver._id.toString(), startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
                res.status(200).json({
                    success: true,
                    data: earnings
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching my earnings:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar ganhos do driver'
                });
            }
        });
        this.driverService = driver_service_1.DriverService;
    }
    // Criar perfil de driver para um User existente
    createDriverProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { userId } = req.params;
                const driverData = req.body;
                // Validações básicas
                if (!driverData.licenseNumber) {
                    res.status(400).json({
                        success: false,
                        message: 'Campo obrigatório: licenseNumber'
                    });
                    return;
                }
                if (!((_a = driverData.vehicleInfo) === null || _a === void 0 ? void 0 : _a.type)) {
                    res.status(400).json({
                        success: false,
                        message: 'Informações do veículo são obrigatórias'
                    });
                    return;
                }
                const driver = yield this.driverService.createDriver(userId, driverData);
                res.status(201).json({
                    success: true,
                    message: 'Perfil de driver criado com sucesso. Aguarde aprovação.',
                    data: {
                        id: driver._id,
                        licenseNumber: driver.licenseNumber,
                        isVerified: driver.isVerified,
                        vehicleInfo: driver.vehicleInfo
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Buscar motorista por ID
    getDriverById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const driver = yield this.driverService.getDriverById(id);
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Motorista não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: driver
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Buscar motorista por User ID
    getDriverByUserId(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const driverProfile = yield this.driverService.getDriverByUserId(userId);
                if (!driverProfile) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado para este usuário'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: driverProfile
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Listar motoristas com filtros
    getDrivers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const filters = {
                    isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
                    isVerified: req.query.isVerified ? req.query.isVerified === 'true' : undefined,
                    vehicleType: req.query.vehicleType,
                    deliveryArea: req.query.deliveryArea,
                    minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined
                };
                // Filtro por proximidade
                if (req.query.lat && req.query.lng && req.query.maxDistance) {
                    filters.nearLocation = {
                        latitude: parseFloat(req.query.lat),
                        longitude: parseFloat(req.query.lng),
                        maxDistance: parseInt(req.query.maxDistance)
                    };
                }
                const drivers = yield this.driverService.getDrivers(filters);
                res.status(200).json({
                    success: true,
                    data: drivers,
                    count: drivers.length
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Atualizar motorista
    updateDriver(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const driver = yield this.driverService.updateDriver(id, updateData);
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Motorista não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Motorista atualizado com sucesso',
                    data: driver
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Atualizar localização do motorista
    updateLocation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { latitude, longitude } = req.body;
                if (!latitude || !longitude) {
                    res.status(400).json({
                        success: false,
                        message: 'Latitude e longitude são obrigatórias'
                    });
                    return;
                }
                const driver = yield this.driverService.updateDriverLocation(id, { latitude, longitude });
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Motorista não encontrado'
                    });
                    return;
                }
                yield delivery_tracking_service_1.deliveryTrackingService.publishForDriver(driver.userId.toString());
                res.status(200).json({
                    success: true,
                    message: 'Localização atualizada com sucesso',
                    data: {
                        id: driver._id,
                        currentLocation: driver.currentLocation
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Alternar disponibilidade do motorista
    toggleAvailability(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { isAvailable } = req.body;
                const driver = yield this.driverService.updateDriver(id, { isAvailable });
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Motorista não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: `Motorista ${driver.isAvailable ? 'disponível' : 'indisponível'}`,
                    data: {
                        id: driver._id,
                        isAvailable: driver.isAvailable
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Buscar motoristas disponíveis
    getAvailableDrivers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { lat, lng, area, maxDistance = '5000' } = req.query;
                if (!lat || !lng || !area) {
                    res.status(400).json({
                        success: false,
                        message: 'Parâmetros obrigatórios: lat, lng, area'
                    });
                    return;
                }
                const drivers = yield this.driverService.findAvailableDrivers({
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lng)
                }, area, parseInt(maxDistance));
                res.status(200).json({
                    success: true,
                    data: drivers,
                    count: drivers.length
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Atribuir motorista a um pedido
    assignToOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId, driverId } = req.body;
                if (!orderId || !driverId) {
                    res.status(400).json({
                        success: false,
                        message: 'orderId e driverId são obrigatórios'
                    });
                    return;
                }
                const result = yield this.driverService.assignDriverToOrder(orderId, driverId);
                res.status(200).json({
                    success: true,
                    message: 'Motorista atribuído ao pedido com sucesso',
                    data: result
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Obter estatísticas do motorista
    getDriverStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const stats = yield this.driverService.getDriverStats(id);
                res.status(200).json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    /**
     * GET /drivers/:id/earnings - Ganhos de um driver específico (admin)
     */
    getDriverEarnings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { startDate, endDate } = req.query;
                const earnings = yield this.driverService.getDriverEarnings(id, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
                res.status(200).json({
                    success: true,
                    data: earnings
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar ganhos do driver'
                });
            }
        });
    }
    // Atualizar rating do motorista
    updateRating(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { rating } = req.body;
                if (!rating || rating < 1 || rating > 5) {
                    res.status(400).json({
                        success: false,
                        message: 'Rating deve estar entre 1 e 5'
                    });
                    return;
                }
                const driver = yield this.driverService.updateDriverRating(id, rating);
                res.status(200).json({
                    success: true,
                    message: 'Rating atualizado com sucesso',
                    data: {
                        id: driver === null || driver === void 0 ? void 0 : driver._id,
                        rating: driver === null || driver === void 0 ? void 0 : driver.rating,
                        reviewCount: driver === null || driver === void 0 ? void 0 : driver.reviewCount
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Verificar motorista (admin)
    verifyDriver(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { isVerified } = req.body;
                const driver = yield this.driverService.verifyDriver(id, isVerified);
                res.status(200).json({
                    success: true,
                    message: `Motorista ${isVerified ? 'verificado' : 'não verificado'}`,
                    data: {
                        id: driver === null || driver === void 0 ? void 0 : driver._id,
                        isVerified: driver === null || driver === void 0 ? void 0 : driver.isVerified
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Deletar motorista (soft delete)
    deleteDriver(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const success = yield this.driverService.deleteDriver(id);
                if (!success) {
                    res.status(404).json({
                        success: false,
                        message: 'Motorista não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Motorista deletado com sucesso'
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Dashboard do motorista
    getDriverDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { userId } = req.params;
                // Verificar se user existe e é driver
                const user = yield User_1.User.findById(userId);
                if (!user || user.role !== 'driver') {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado ou não é driver'
                    });
                    return;
                }
                // Buscar perfil de driver
                const driver = yield this.driverService.getDriverByUserId(userId);
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                // Obter estatísticas
                const stats = yield this.driverService.getDriverStats(((_a = driver._id) === null || _a === void 0 ? void 0 : _a.toString()) || '');
                res.status(200).json({
                    success: true,
                    data: {
                        user: {
                            userId: user.userId,
                            email: user.email,
                            phoneNumber: user.phoneNumber,
                            role: user.role,
                            isActive: user.isActive
                        },
                        driver: {
                            licenseNumber: driver.licenseNumber,
                            vehicleInfo: driver.vehicleInfo,
                            isAvailable: driver.isAvailable,
                            isVerified: driver.isVerified,
                            rating: driver.rating,
                            totalDeliveries: driver.totalDeliveries,
                            completedDeliveries: driver.completedDeliveries
                        },
                        stats
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
}
exports.DriverController = DriverController;
exports.default = new DriverController();
