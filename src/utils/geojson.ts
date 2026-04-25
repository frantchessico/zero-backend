export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][];
  metadata?: {
    provider?: string;
    distanceMeters?: number;
    durationSeconds?: number;
  };
}

export interface GeoFeature<TGeometry = GeoPoint | GeoLineString> {
  type: 'Feature';
  geometry: TGeometry;
  properties: Record<string, any>;
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: Array<GeoFeature>;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const toGeoPoint = (location?: LatLng | null): GeoPoint | undefined => {
  if (!location || !isFiniteCoordinate(location.lat) || !isFiniteCoordinate(location.lng)) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [location.lng, location.lat]
  };
};

export const fromGeoPoint = (
  point?: { type?: string; coordinates?: number[] } | null
): LatLng | undefined => {
  if (!point || point.type !== 'Point' || !point.coordinates || point.coordinates.length !== 2) {
    return undefined;
  }

  const [lng, lat] = point.coordinates;
  if (!isFiniteCoordinate(lat) || !isFiniteCoordinate(lng)) {
    return undefined;
  }

  return { lat, lng };
};

export const pointFeature = (
  location: LatLng | undefined,
  properties: Record<string, any>
): GeoFeature<GeoPoint> | null => {
  const geometry = toGeoPoint(location);
  if (!geometry) {
    return null;
  }

  return {
    type: 'Feature',
    geometry,
    properties
  };
};

export const lineStringFeature = (
  coordinates: Array<[number, number]>,
  properties: Record<string, any>
): GeoFeature<GeoLineString> | null => {
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

export const featureCollection = (features: Array<GeoFeature | null | undefined>): GeoFeatureCollection => ({
  type: 'FeatureCollection',
  features: features.filter(Boolean) as GeoFeature[]
});

export const resolveLatLng = (value: any): LatLng | undefined => {
  if (!value) {
    return undefined;
  }

  if (value.coordinates && isFiniteCoordinate(value.coordinates.lat) && isFiniteCoordinate(value.coordinates.lng)) {
    return {
      lat: value.coordinates.lat,
      lng: value.coordinates.lng
    };
  }

  if (isFiniteCoordinate(value.lat) && isFiniteCoordinate(value.lng)) {
    return {
      lat: value.lat,
      lng: value.lng
    };
  }

  if (
    isFiniteCoordinate(value.latitude) &&
    isFiniteCoordinate(value.longitude)
  ) {
    return {
      lat: value.latitude,
      lng: value.longitude
    };
  }

  if (value.geoPoint) {
    return fromGeoPoint(value.geoPoint);
  }

  if (value.currentLocation?.geoPoint) {
    return fromGeoPoint(value.currentLocation.geoPoint);
  }

  return undefined;
};

export const haversineDistanceKm = (start: LatLng, end: LatLng): number => {
  const earthRadius = 6371;
  const deltaLat = ((end.lat - start.lat) * Math.PI) / 180;
  const deltaLng = ((end.lng - start.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos((start.lat * Math.PI) / 180) *
      Math.cos((end.lat * Math.PI) / 180) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
