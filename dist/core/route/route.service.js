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
exports.RouteService = void 0;
const mongoose_1 = require("mongoose");
const Route_1 = require("../../models/Route");
const PersonalDelivery_1 = require("../../models/PersonalDelivery");
const Delivery_1 = require("../../models/Delivery");
const Driver_1 = require("../../models/Driver");
class RouteService {
    static buildRouteForDriver(driverId_1) {
        return __awaiter(this, arguments, void 0, function* (driverId, options = {}) {
            const { personalDeliveryIds, deliveryIds, includePersonal = true, includeDeliveries = true, maxStops = 10 } = options;
            if (!mongoose_1.Types.ObjectId.isValid(driverId)) {
                throw new Error('Driver inválido');
            }
            const driver = yield Driver_1.Driver.findById(driverId).exec();
            if (!driver || !driver.isVerified) {
                throw new Error('Driver não encontrado ou não verificado');
            }
            const driverObjectId = new mongoose_1.Types.ObjectId(driverId);
            const existingPlannedRoute = yield Route_1.Route.findOne({
                driver: driverObjectId,
                status: { $in: ['planned', 'in_progress'] }
            }).exec();
            if (existingPlannedRoute) {
                throw new Error('O motorista já possui uma rota ativa');
            }
            const stops = [];
            if (includePersonal) {
                const personalQuery = {
                    status: { $in: ['pending', 'confirmed', 'picked_up', 'in_transit'] },
                    driver: driver.userId,
                    $or: [{ route: { $exists: false } }, { route: null }]
                };
                if (personalDeliveryIds === null || personalDeliveryIds === void 0 ? void 0 : personalDeliveryIds.length) {
                    personalQuery._id = { $in: personalDeliveryIds.map((id) => new mongoose_1.Types.ObjectId(id)) };
                }
                else {
                    delete personalQuery.driver;
                    personalQuery.$or = [
                        { driver: { $exists: false }, route: { $exists: false } },
                        { driver: { $exists: false }, route: null },
                        { driver: driver.userId, route: { $exists: false } },
                        { driver: driver.userId, route: null }
                    ];
                }
                const personalDeliveries = yield PersonalDelivery_1.PersonalDelivery.find(personalQuery)
                    .limit(maxStops)
                    .exec();
                personalDeliveries.forEach((personalDelivery) => {
                    var _a;
                    const coords = ((_a = personalDelivery.pickupAddress) === null || _a === void 0 ? void 0 : _a.coordinates) || { lat: 0, lng: 0 };
                    stops.push({
                        kind: 'personal',
                        id: personalDelivery._id,
                        lat: coords.lat || 0,
                        lng: coords.lng || 0
                    });
                });
            }
            if (includeDeliveries) {
                const deliveryQuery = {
                    status: { $in: ['picked_up', 'in_transit'] },
                    driver: driver.userId,
                    $or: [{ route: { $exists: false } }, { route: null }]
                };
                if (deliveryIds === null || deliveryIds === void 0 ? void 0 : deliveryIds.length) {
                    deliveryQuery._id = { $in: deliveryIds.map((id) => new mongoose_1.Types.ObjectId(id)) };
                }
                const deliveries = yield Delivery_1.Delivery.find(deliveryQuery)
                    .limit(maxStops)
                    .populate('order')
                    .exec();
                deliveries.forEach((delivery) => {
                    var _a;
                    const order = delivery.order;
                    const coords = ((_a = order === null || order === void 0 ? void 0 : order.deliveryAddress) === null || _a === void 0 ? void 0 : _a.coordinates) || { lat: 0, lng: 0 };
                    stops.push({
                        kind: 'delivery',
                        id: delivery._id,
                        lat: coords.lat || 0,
                        lng: coords.lng || 0
                    });
                });
            }
            if (!stops.length) {
                throw new Error('Nenhuma entrega disponível para montar rota');
            }
            const limitedStops = stops.slice(0, maxStops);
            const orderedStops = this.orderStopsByNearestNeighbor(limitedStops);
            const personalDeliveryIdsOrdered = orderedStops
                .filter((stop) => stop.kind === 'personal')
                .map((stop) => stop.id);
            const deliveryIdsOrdered = orderedStops
                .filter((stop) => stop.kind === 'delivery')
                .map((stop) => stop.id);
            const route = yield Route_1.Route.create({
                driver: driverObjectId,
                personalDeliveries: personalDeliveryIdsOrdered,
                deliveries: deliveryIdsOrdered,
                geometry: {
                    type: 'LineString',
                    coordinates: orderedStops.map((stop) => [stop.lng, stop.lat]),
                    metadata: {
                        provider: 'nearest-neighbor'
                    }
                },
                status: 'planned'
            });
            if (personalDeliveryIdsOrdered.length > 0) {
                yield PersonalDelivery_1.PersonalDelivery.updateMany({ _id: { $in: personalDeliveryIdsOrdered } }, {
                    $set: {
                        route: route._id,
                        driver: driver.userId
                    }
                }).exec();
            }
            if (deliveryIdsOrdered.length > 0) {
                yield Delivery_1.Delivery.updateMany({ _id: { $in: deliveryIdsOrdered } }, {
                    $set: {
                        route: route._id
                    }
                }).exec();
            }
            return route;
        });
    }
    static orderStopsByNearestNeighbor(stops) {
        if (stops.length <= 1)
            return stops;
        const remaining = [...stops];
        const ordered = [];
        let current = remaining.shift();
        ordered.push(current);
        while (remaining.length) {
            let nearestIndex = 0;
            let nearestDistance = Number.MAX_VALUE;
            remaining.forEach((stop, index) => {
                const distance = this.calculateDistance(current.lat, current.lng, stop.lat, stop.lng);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });
            current = remaining.splice(nearestIndex, 1)[0];
            ordered.push(current);
        }
        return ordered;
    }
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = RouteService.deg2rad(lat2 - lat1);
        const dLon = RouteService.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(RouteService.deg2rad(lat1)) * Math.cos(RouteService.deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    static deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
}
exports.RouteService = RouteService;
