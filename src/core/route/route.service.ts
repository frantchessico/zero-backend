import { Types } from 'mongoose';
import { Route } from '../../models/Route';
import { PersonalDelivery } from '../../models/PersonalDelivery';
import { Delivery } from '../../models/Delivery';

export interface BuildRouteOptions {
  personalDeliveryIds?: string[]; // IDs específicos de entregas pessoais
  deliveryIds?: string[]; // IDs específicos de Delivery (pedidos normais)
  includePersonal?: boolean; // Incluir personalDeliveries automaticamente
  includeDeliveries?: boolean; // Incluir Deliveries automaticamente
  maxStops?: number; // Limite total de paragens na rota (default: 10)
}

type StopKind = 'personal' | 'delivery';

interface RouteStopCandidate {
  kind: StopKind;
  id: Types.ObjectId;
  lat: number;
  lng: number;
}

export class RouteService {
  /**
   * Cria uma rota planejada para um driver, agrupando entregas pessoais
   * e entregas normais (Delivery) e ordenando por proximidade.
   */
  static async buildRouteForDriver(
    driverId: string,
    options: BuildRouteOptions = {}
  ) {
    const {
      personalDeliveryIds,
      deliveryIds,
      includePersonal = true,
      includeDeliveries = true,
      maxStops = 10
    } = options;

    const driverObjectId = new Types.ObjectId(driverId);

    const stops: RouteStopCandidate[] = [];

    // ===== Candidatos: PersonalDelivery =====
    if (includePersonal) {
      const personalQuery: any = {
        status: 'pending',
        driver: { $exists: false }
      };

      if (personalDeliveryIds && personalDeliveryIds.length > 0) {
        personalQuery._id = { $in: personalDeliveryIds.map(id => new Types.ObjectId(id)) };
      }

      const personalDeliveries = await PersonalDelivery.find(personalQuery)
        .limit(maxStops)
        .exec();

      personalDeliveries.forEach(pd => {
        const coords = pd.pickupAddress?.coordinates || { lat: 0, lng: 0 };
        stops.push({
          kind: 'personal',
          id: pd._id as Types.ObjectId,
          lat: coords.lat || 0,
          lng: coords.lng || 0
        });
      });
    }

    // ===== Candidatos: Delivery (ligadas a Order) =====
    if (includeDeliveries) {
      const deliveryQuery: any = {};

      if (deliveryIds && deliveryIds.length > 0) {
        deliveryQuery._id = { $in: deliveryIds.map(id => new Types.ObjectId(id)) };
      }

      // Exemplo simples: considerar entregas ainda não concluídas
      deliveryQuery.status = { $in: ['picked_up', 'in_transit'] };

      const deliveries = await Delivery.find(deliveryQuery)
        .limit(maxStops)
        .populate('order')
        .exec();

      deliveries.forEach(d => {
        const order: any = (d as any).order;
        const coords = order?.deliveryAddress?.coordinates || { lat: 0, lng: 0 };
        stops.push({
          kind: 'delivery',
          id: d._id as Types.ObjectId,
          lat: coords.lat || 0,
          lng: coords.lng || 0
        });
      });
    }

    if (!stops.length) {
      throw new Error('Nenhuma entrega disponível para montar rota');
    }

    // Limitar número total de stops
    const limitedStops = stops.slice(0, maxStops);

    // Ordenar paragens por proximidade
    const orderedStops = this.orderStopsByNearestNeighbor(limitedStops);

    const personalDeliveryIdsOrdered = orderedStops
      .filter(s => s.kind === 'personal')
      .map(s => s.id);

    const deliveryIdsOrdered = orderedStops
      .filter(s => s.kind === 'delivery')
      .map(s => s.id);

    const route = await Route.create({
      driver: driverObjectId,
      personalDeliveries: personalDeliveryIdsOrdered,
      deliveries: deliveryIdsOrdered,
      status: 'planned'
    });

    return route;
  }

  /**
   * Ordena uma lista de paragens usando heurística de vizinho mais próximo.
   */
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
        const distance = this.calculateDistance(
          current.lat,
          current.lng,
          stop.lat,
          stop.lng
        );

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

  /**
   * Cálculo de distância Haversine (reuso da lógica de personal-delivery)
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = RouteService.deg2rad(lat2 - lat1);
    const dLon = RouteService.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(RouteService.deg2rad(lat1)) * Math.cos(RouteService.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}


