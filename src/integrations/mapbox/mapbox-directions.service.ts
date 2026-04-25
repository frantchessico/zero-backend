import { GeoLineString } from '../../utils/geojson';
import { logger } from '../../utils/logger';

export interface MapboxRouteRequest {
  profile?: 'driving' | 'driving-traffic' | 'cycling' | 'walking';
  coordinates: Array<[number, number]>;
}

class MapboxDirectionsService {
  private readonly accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  private readonly baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';
  private readonly memoryCache = new Map<string, GeoLineString>();

  private cacheKey(request: MapboxRouteRequest) {
    return `${request.profile || 'driving-traffic'}:${request.coordinates
      .map((coordinate) => coordinate.join(','))
      .join(';')}`;
  }

  private fallbackLineString(coordinates: Array<[number, number]>): GeoLineString {
    return {
      type: 'LineString',
      coordinates,
      metadata: {
        provider: 'fallback'
      }
    };
  }

  async buildRoute(request: MapboxRouteRequest): Promise<GeoLineString> {
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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox Directions responded with ${response.status}`);
      }

      const payload = (await response.json()) as {
        routes?: Array<{
          geometry?: {
            coordinates: [number, number][];
          };
          distance?: number;
          duration?: number;
        }>;
      };

      const firstRoute = payload.routes?.[0];
      if (!firstRoute?.geometry?.coordinates?.length) {
        throw new Error('Mapbox Directions returned no route geometry');
      }

      const route: GeoLineString = {
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
    } catch (error: any) {
      logger.warn(`Mapbox route fallback activated: ${error.message}`);
      const fallback = this.fallbackLineString(request.coordinates);
      this.memoryCache.set(cacheKey, fallback);
      return fallback;
    }
  }
}

export const mapboxDirectionsService = new MapboxDirectionsService();
