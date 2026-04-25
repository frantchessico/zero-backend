import { Types } from 'mongoose';
import { Route } from '../../models/Route';
import { PersonalDelivery } from '../../models/PersonalDelivery';
import { Delivery } from '../../models/Delivery';
import { Driver } from '../../models/Driver';

export interface BuildRouteOptions {
  personalDeliveryIds?: string[];
  deliveryIds?: string[];
  includePersonal?: boolean;
  includeDeliveries?: boolean;
  maxStops?: number;
}

type StopKind = 'personal' | 'delivery';

interface RouteStopCandidate {
  kind: StopKind;
  id: Types.ObjectId;
  lat: number;
  lng: number;
}

export class RouteService {
  static async buildRouteForDriver(driverId: string, options: BuildRouteOptions = {}) {
    const {
      personalDeliveryIds,
      deliveryIds,
      includePersonal = true,
      includeDeliveries = true,
      maxStops = 10
    } = options;

    if (!Types.ObjectId.isValid(driverId)) {
      throw new Error('Driver inválido');
    }

    const driver = await Driver.findById(driverId).exec();
    if (!driver || !driver.isVerified) {
      throw new Error('Driver não encontrado ou não verificado');
    }

    const driverObjectId = new Types.ObjectId(driverId);
    const existingPlannedRoute = await Route.findOne({
      driver: driverObjectId,
      status: { $in: ['planned', 'in_progress'] }
    }).exec();

    if (existingPlannedRoute) {
      throw new Error('O motorista já possui uma rota ativa');
    }

    const stops: RouteStopCandidate[] = [];

    if (includePersonal) {
      const personalQuery: any = {
        status: { $in: ['pending', 'confirmed', 'picked_up', 'in_transit'] },
        driver: driver.userId,
        $or: [{ route: { $exists: false } }, { route: null }]
      };

      if (personalDeliveryIds?.length) {
        personalQuery._id = { $in: personalDeliveryIds.map((id) => new Types.ObjectId(id)) };
      } else {
        delete personalQuery.driver;
        personalQuery.$or = [
          { driver: { $exists: false }, route: { $exists: false } },
          { driver: { $exists: false }, route: null },
          { driver: driver.userId, route: { $exists: false } },
          { driver: driver.userId, route: null }
        ];
      }

      const personalDeliveries = await PersonalDelivery.find(personalQuery)
        .limit(maxStops)
        .exec();

      personalDeliveries.forEach((personalDelivery) => {
        const coords = personalDelivery.pickupAddress?.coordinates || { lat: 0, lng: 0 };
        stops.push({
          kind: 'personal',
          id: personalDelivery._id as Types.ObjectId,
          lat: coords.lat || 0,
          lng: coords.lng || 0
        });
      });
    }

    if (includeDeliveries) {
      const deliveryQuery: any = {
        status: { $in: ['picked_up', 'in_transit'] },
        driver: driver.userId,
        $or: [{ route: { $exists: false } }, { route: null }]
      };

      if (deliveryIds?.length) {
        deliveryQuery._id = { $in: deliveryIds.map((id) => new Types.ObjectId(id)) };
      }

      const deliveries = await Delivery.find(deliveryQuery)
        .limit(maxStops)
        .populate('order')
        .exec();

      deliveries.forEach((delivery) => {
        const order: any = (delivery as any).order;
        const coords = order?.deliveryAddress?.coordinates || { lat: 0, lng: 0 };
        stops.push({
          kind: 'delivery',
          id: delivery._id as Types.ObjectId,
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

    const route = await Route.create({
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
      await PersonalDelivery.updateMany(
        { _id: { $in: personalDeliveryIdsOrdered } },
        {
          $set: {
            route: route._id,
            driver: driver.userId
          }
        }
      ).exec();
    }

    if (deliveryIdsOrdered.length > 0) {
      await Delivery.updateMany(
        { _id: { $in: deliveryIdsOrdered } },
        {
          $set: {
            route: route._id
          }
        }
      ).exec();
    }

    return route;
  }

  private static orderStopsByNearestNeighbor(stops: RouteStopCandidate[]) {
    if (stops.length <= 1) return stops;

    const remaining = [...stops];
    const ordered: RouteStopCandidate[] = [];

    let current = remaining.shift() as RouteStopCandidate;
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

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = RouteService.deg2rad(lat2 - lat1);
    const dLon = RouteService.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(RouteService.deg2rad(lat1)) * Math.cos(RouteService.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
