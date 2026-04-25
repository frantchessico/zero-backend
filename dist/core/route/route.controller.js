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
exports.RouteController = void 0;
const User_1 = require("../../models/User");
const Driver_1 = require("../../models/Driver");
const Route_1 = require("../../models/Route");
const route_service_1 = require("./route.service");
const logger_1 = require("../../utils/logger");
class RouteController {
    constructor() {
        /**
         * POST /routes/my/build - Driver autenticado monta sua rota
         */
        this.buildMyRoute = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                        message: 'Apenas drivers podem montar rotas'
                    });
                    return;
                }
                const driver = yield Driver_1.Driver.findOne({ userId: user._id });
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                const { maxStops, includePersonal, includeDeliveries, personalDeliveryIds, deliveryIds } = req.body || {};
                const route = yield route_service_1.RouteService.buildRouteForDriver(driver._id.toString(), {
                    maxStops,
                    includePersonal,
                    includeDeliveries,
                    personalDeliveryIds,
                    deliveryIds
                });
                res.status(201).json({
                    success: true,
                    message: 'Rota planejada com sucesso',
                    data: route
                });
            }
            catch (error) {
                logger_1.logger.error('Error building driver route:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao montar rota'
                });
            }
        });
        /**
         * POST /routes/:driverId/build - Montar rota para um driver específico (admin/ops)
         */
        this.buildRouteForDriver = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { driverId } = req.params;
                const { maxStops, includePersonal, includeDeliveries, personalDeliveryIds, deliveryIds } = req.body || {};
                const driver = yield Driver_1.Driver.findById(driverId);
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Driver não encontrado'
                    });
                    return;
                }
                const route = yield route_service_1.RouteService.buildRouteForDriver(driver._id.toString(), {
                    maxStops,
                    includePersonal,
                    includeDeliveries,
                    personalDeliveryIds,
                    deliveryIds
                });
                res.status(201).json({
                    success: true,
                    message: 'Rota planejada com sucesso',
                    data: route
                });
            }
            catch (error) {
                logger_1.logger.error('Error building route for driver:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao montar rota para driver'
                });
            }
        });
        /**
         * GET /routes/my/active - Buscar rota ativa do driver autenticado
         */
        this.getMyActiveRoute = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                        message: 'Apenas drivers podem acessar a rota ativa'
                    });
                    return;
                }
                const driver = yield Driver_1.Driver.findOne({ userId: user._id });
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                const route = yield Route_1.Route.findOne({
                    driver: driver._id,
                    status: { $in: ['planned', 'in_progress'] }
                })
                    .populate('personalDeliveries')
                    .populate('deliveries')
                    .exec();
                if (!route) {
                    res.status(404).json({
                        success: false,
                        message: 'Nenhuma rota ativa encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: route
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching active route:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar rota ativa'
                });
            }
        });
    }
}
exports.RouteController = RouteController;
exports.default = new RouteController();
