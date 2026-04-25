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
exports.mapboxDirectionsService = void 0;
const logger_1 = require("../../utils/logger");
class MapboxDirectionsService {
    constructor() {
        this.accessToken = process.env.MAPBOX_ACCESS_TOKEN;
        this.baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';
        this.memoryCache = new Map();
    }
    cacheKey(request) {
        return `${request.profile || 'driving-traffic'}:${request.coordinates
            .map((coordinate) => coordinate.join(','))
            .join(';')}`;
    }
    fallbackLineString(coordinates) {
        return {
            type: 'LineString',
            coordinates,
            metadata: {
                provider: 'fallback'
            }
        };
    }
    buildRoute(request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (request.coordinates.length < 2) {
                return this.fallbackLineString(request.coordinates);
            }
            const cacheKey = this.cacheKey(request);
            const cached = this.memoryCache.get(cacheKey);
            if (cached) {
                return cached;
            }
            if (!this.accessToken) {
                const fallback = this.fallbackLineString(request.coordinates);
                this.memoryCache.set(cacheKey, fallback);
                return fallback;
            }
            const profile = request.profile || 'driving-traffic';
            const coordinates = request.coordinates.map((coordinate) => coordinate.join(',')).join(';');
            const url = `${this.baseUrl}/${profile}/${coordinates}?alternatives=false&continue_straight=true&geometries=geojson&overview=full&steps=false&access_token=${this.accessToken}`;
            try {
                const response = yield fetch(url);
                if (!response.ok) {
                    throw new Error(`Mapbox Directions responded with ${response.status}`);
                }
                const payload = (yield response.json());
                const firstRoute = (_a = payload.routes) === null || _a === void 0 ? void 0 : _a[0];
                if (!((_c = (_b = firstRoute === null || firstRoute === void 0 ? void 0 : firstRoute.geometry) === null || _b === void 0 ? void 0 : _b.coordinates) === null || _c === void 0 ? void 0 : _c.length)) {
                    throw new Error('Mapbox Directions returned no route geometry');
                }
                const route = {
                    type: 'LineString',
                    coordinates: firstRoute.geometry.coordinates,
                    metadata: {
                        provider: 'mapbox',
                        distanceMeters: firstRoute.distance,
                        durationSeconds: firstRoute.duration
                    }
                };
                this.memoryCache.set(cacheKey, route);
                return route;
            }
            catch (error) {
                logger_1.logger.warn(`Mapbox route fallback activated: ${error.message}`);
                const fallback = this.fallbackLineString(request.coordinates);
                this.memoryCache.set(cacheKey, fallback);
                return fallback;
            }
        });
    }
}
exports.mapboxDirectionsService = new MapboxDirectionsService();
