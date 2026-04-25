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
exports.deliveryTrackingService = void 0;
const Delivery_1 = require("../../models/Delivery");
const Driver_1 = require("../../models/Driver");
const Order_1 = require("../../models/Order");
const Vendor_1 = require("../../models/Vendor");
const mapbox_directions_service_1 = require("../../integrations/mapbox/mapbox-directions.service");
const geojson_1 = require("../../utils/geojson");
const tracking_gateway_1 = require("../../realtime/tracking.gateway");
class DeliveryTrackingService {
    transportBaseUrl() {
        return process.env.PUBLIC_APP_URL || process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '';
    }
    roomForDelivery(deliveryId) {
        return `delivery:${deliveryId}`;
    }
    roomForOrder(orderId) {
        return `order:${orderId}`;
    }
    ensureRouteGeometry(delivery, origin, destination) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if ((_b = (_a = delivery.routeGeometry) === null || _a === void 0 ? void 0 : _a.coordinates) === null || _b === void 0 ? void 0 : _b.length) {
                return delivery.routeGeometry;
            }
            if (!origin || !destination) {
                return null;
            }
            const routeGeometry = yield mapbox_directions_service_1.mapboxDirectionsService.buildRoute({
                profile: 'driving-traffic',
                coordinates: [
                    [origin.lng, origin.lat],
                    [destination.lng, destination.lat]
                ]
            });
            delivery.routeGeometry = routeGeometry;
            yield delivery.save();
            return routeGeometry;
        });
    }
    getDeliverySnapshot(deliveryId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const delivery = yield Delivery_1.Delivery.findById(deliveryId).exec();
            if (!delivery) {
                throw new Error('Entrega não encontrada');
            }
            const order = yield Order_1.Order.findById(delivery.order)
                .populate('customer', 'userId phoneNumber email')
                .populate('vendor', 'name address')
                .exec();
            if (!order) {
                throw new Error('Pedido da entrega não encontrado');
            }
            const driverProfile = yield Driver_1.Driver.findOne({ userId: delivery.driver })
                .populate('user', 'userId phoneNumber email')
                .exec();
            const vendor = yield Vendor_1.Vendor.findById(order.vendor).populate('owner', 'userId phoneNumber email').exec();
            const destinationLocation = (0, geojson_1.resolveLatLng)(order.deliveryAddress);
            const pickupLocation = (0, geojson_1.resolveLatLng)(vendor === null || vendor === void 0 ? void 0 : vendor.address);
            const driverLocation = (0, geojson_1.resolveLatLng)(delivery.currentLocation) ||
                (0, geojson_1.resolveLatLng)(driverProfile === null || driverProfile === void 0 ? void 0 : driverProfile.currentLocation) ||
                pickupLocation;
            const routeGeometry = yield this.ensureRouteGeometry(delivery, pickupLocation, destinationLocation);
            const features = (0, geojson_1.featureCollection)([
                ((_a = routeGeometry === null || routeGeometry === void 0 ? void 0 : routeGeometry.coordinates) === null || _a === void 0 ? void 0 : _a.length)
                    ? {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: routeGeometry.coordinates
                        },
                        properties: {
                            kind: 'route',
                            deliveryId: delivery._id.toString(),
                            provider: ((_b = routeGeometry.metadata) === null || _b === void 0 ? void 0 : _b.provider) || 'fallback',
                            distanceMeters: (_c = routeGeometry.metadata) === null || _c === void 0 ? void 0 : _c.distanceMeters,
                            durationSeconds: (_d = routeGeometry.metadata) === null || _d === void 0 ? void 0 : _d.durationSeconds
                        }
                    }
                    : null,
                (0, geojson_1.pointFeature)(driverLocation, {
                    kind: 'driver',
                    deliveryId: delivery._id.toString(),
                    driverId: (_e = driverProfile === null || driverProfile === void 0 ? void 0 : driverProfile._id) === null || _e === void 0 ? void 0 : _e.toString(),
                    userId: (_f = driverProfile === null || driverProfile === void 0 ? void 0 : driverProfile.userId) === null || _f === void 0 ? void 0 : _f.toString(),
                    licenseNumber: driverProfile === null || driverProfile === void 0 ? void 0 : driverProfile.licenseNumber
                }),
                (0, geojson_1.pointFeature)(pickupLocation, {
                    kind: 'pickup',
                    orderId: order._id.toString(),
                    vendorId: (_g = vendor === null || vendor === void 0 ? void 0 : vendor._id) === null || _g === void 0 ? void 0 : _g.toString(),
                    vendorName: vendor === null || vendor === void 0 ? void 0 : vendor.name
                }),
                (0, geojson_1.pointFeature)(destinationLocation, {
                    kind: 'destination',
                    orderId: order._id.toString()
                })
            ]);
            const distanceKm = driverLocation && destinationLocation
                ? (0, geojson_1.haversineDistanceKm)(driverLocation, destinationLocation)
                : null;
            const etaMinutes = distanceKm !== null ? Math.max(1, Math.ceil((distanceKm / 30) * 60)) : null;
            return {
                delivery: {
                    id: delivery._id.toString(),
                    status: delivery.status,
                    estimatedTime: delivery.estimatedTime,
                    currentLocation: delivery.currentLocation || (driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : undefined),
                    assignedAt: delivery.assignedAt,
                    deliveredAt: delivery.deliveredAt
                },
                order: {
                    id: order._id.toString(),
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    payableTotal: (_h = order.payableTotal) !== null && _h !== void 0 ? _h : order.total,
                    estimatedDeliveryTime: order.estimatedDeliveryTime,
                    deliveryAddress: order.deliveryAddress
                },
                driver: driverProfile
                    ? {
                        id: String(driverProfile._id),
                        userId: driverProfile.userId.toString(),
                        licenseNumber: driverProfile.licenseNumber,
                        vehicleInfo: driverProfile.vehicleInfo,
                        currentLocation: driverProfile.currentLocation
                            ? {
                                lat: driverProfile.currentLocation.latitude,
                                lng: driverProfile.currentLocation.longitude
                            }
                            : undefined,
                        rating: driverProfile.rating
                    }
                    : null,
                vendor: vendor
                    ? {
                        id: vendor._id.toString(),
                        name: vendor.name,
                        address: vendor.address
                    }
                    : null,
                tracking: {
                    lastUpdatedAt: new Date().toISOString(),
                    estimatedDistanceKm: distanceKm,
                    estimatedTimeRemainingMinutes: etaMinutes
                },
                geojson: features,
                realtime: {
                    provider: 'socket.io',
                    baseUrl: this.transportBaseUrl(),
                    room: this.roomForDelivery(delivery._id.toString()),
                    orderRoom: this.roomForOrder(order._id.toString())
                }
            };
        });
    }
    publishDeliverySnapshot(deliveryId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.getDeliverySnapshot(deliveryId);
            yield tracking_gateway_1.trackingGateway.publish(this.roomForDelivery(deliveryId), snapshot);
            yield tracking_gateway_1.trackingGateway.publish(this.roomForOrder(snapshot.order.id), snapshot);
            return snapshot;
        });
    }
    publishForDriver(driverUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            const deliveries = yield Delivery_1.Delivery.find({
                driver: driverUserId,
                status: { $in: ['picked_up', 'in_transit'] }
            }).select('_id');
            for (const delivery of deliveries) {
                yield this.publishDeliverySnapshot(delivery._id.toString());
            }
        });
    }
}
exports.deliveryTrackingService = new DeliveryTrackingService();
