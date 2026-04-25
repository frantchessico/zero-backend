"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.haversineDistanceKm = exports.resolveLatLng = exports.featureCollection = exports.lineStringFeature = exports.pointFeature = exports.fromGeoPoint = exports.toGeoPoint = exports.isFiniteCoordinate = void 0;
const isFiniteCoordinate = (value) => typeof value === 'number' && Number.isFinite(value);
exports.isFiniteCoordinate = isFiniteCoordinate;
const toGeoPoint = (location) => {
    if (!location || !(0, exports.isFiniteCoordinate)(location.lat) || !(0, exports.isFiniteCoordinate)(location.lng)) {
        return undefined;
    }
    return {
        type: 'Point',
        coordinates: [location.lng, location.lat]
    };
};
exports.toGeoPoint = toGeoPoint;
const fromGeoPoint = (point) => {
    if (!point || point.type !== 'Point' || !point.coordinates || point.coordinates.length !== 2) {
        return undefined;
    }
    const [lng, lat] = point.coordinates;
    if (!(0, exports.isFiniteCoordinate)(lat) || !(0, exports.isFiniteCoordinate)(lng)) {
        return undefined;
    }
    return { lat, lng };
};
exports.fromGeoPoint = fromGeoPoint;
const pointFeature = (location, properties) => {
    const geometry = (0, exports.toGeoPoint)(location);
    if (!geometry) {
        return null;
    }
    return {
        type: 'Feature',
        geometry,
        properties
    };
};
exports.pointFeature = pointFeature;
const lineStringFeature = (coordinates, properties) => {
    if (!coordinates.length) {
        return null;
    }
    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates
        },
        properties
    };
};
exports.lineStringFeature = lineStringFeature;
const featureCollection = (features) => ({
    type: 'FeatureCollection',
    features: features.filter(Boolean)
});
exports.featureCollection = featureCollection;
const resolveLatLng = (value) => {
    var _a;
    if (!value) {
        return undefined;
    }
    if (value.coordinates && (0, exports.isFiniteCoordinate)(value.coordinates.lat) && (0, exports.isFiniteCoordinate)(value.coordinates.lng)) {
        return {
            lat: value.coordinates.lat,
            lng: value.coordinates.lng
        };
    }
    if ((0, exports.isFiniteCoordinate)(value.lat) && (0, exports.isFiniteCoordinate)(value.lng)) {
        return {
            lat: value.lat,
            lng: value.lng
        };
    }
    if ((0, exports.isFiniteCoordinate)(value.latitude) &&
        (0, exports.isFiniteCoordinate)(value.longitude)) {
        return {
            lat: value.latitude,
            lng: value.longitude
        };
    }
    if (value.geoPoint) {
        return (0, exports.fromGeoPoint)(value.geoPoint);
    }
    if ((_a = value.currentLocation) === null || _a === void 0 ? void 0 : _a.geoPoint) {
        return (0, exports.fromGeoPoint)(value.currentLocation.geoPoint);
    }
    return undefined;
};
exports.resolveLatLng = resolveLatLng;
const haversineDistanceKm = (start, end) => {
    const earthRadius = 6371;
    const deltaLat = ((end.lat - start.lat) * Math.PI) / 180;
    const deltaLng = ((end.lng - start.lng) * Math.PI) / 180;
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos((start.lat * Math.PI) / 180) *
            Math.cos((end.lat * Math.PI) / 180) *
            Math.sin(deltaLng / 2) *
            Math.sin(deltaLng / 2);
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
exports.haversineDistanceKm = haversineDistanceKm;
