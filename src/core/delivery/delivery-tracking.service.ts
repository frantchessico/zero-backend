import { Delivery } from '../../models/Delivery';
import { Driver } from '../../models/Driver';
import { Order } from '../../models/Order';
import { Vendor } from '../../models/Vendor';
import { mapboxDirectionsService } from '../../integrations/mapbox/mapbox-directions.service';
import {
  featureCollection,
  haversineDistanceKm,
  pointFeature,
  resolveLatLng,
  type GeoFeatureCollection,
  type LatLng
} from '../../utils/geojson';
import { trackingGateway } from '../../realtime/tracking.gateway';

class DeliveryTrackingService {
  private transportBaseUrl() {
    return process.env.PUBLIC_APP_URL || process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '';
  }

  private roomForDelivery(deliveryId: string) {
    return `delivery:${deliveryId}`;
  }

  private roomForOrder(orderId: string) {
    return `order:${orderId}`;
  }

  private async ensureRouteGeometry(delivery: any, origin?: LatLng, destination?: LatLng) {
    if (delivery.routeGeometry?.coordinates?.length) {
      return delivery.routeGeometry;
    }

    if (!origin || !destination) {
      return null;
    }

    const routeGeometry = await mapboxDirectionsService.buildRoute({
      profile: 'driving-traffic',
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat]
      ]
    });

    delivery.routeGeometry = routeGeometry as any;
    await delivery.save();
    return routeGeometry;
  }

  async getDeliverySnapshot(deliveryId: string) {
    const delivery = await Delivery.findById(deliveryId).exec();
    if (!delivery) {
      throw new Error('Entrega não encontrada');
    }

    const order = await Order.findById(delivery.order)
      .populate('customer', 'userId phoneNumber email')
      .populate('vendor', 'name address')
      .exec();

    if (!order) {
      throw new Error('Pedido da entrega não encontrado');
    }

    const driverProfile = await Driver.findOne({ userId: delivery.driver })
      .populate('user', 'userId phoneNumber email')
      .exec();

    const vendor = await Vendor.findById(order.vendor).populate('owner', 'userId phoneNumber email').exec();

    const destinationLocation = resolveLatLng(order.deliveryAddress);
    const pickupLocation = resolveLatLng(vendor?.address);
    const driverLocation =
      resolveLatLng(delivery.currentLocation) ||
      resolveLatLng(driverProfile?.currentLocation) ||
      pickupLocation;

    const routeGeometry = await this.ensureRouteGeometry(delivery, pickupLocation, destinationLocation);

    const features = featureCollection([
      routeGeometry?.coordinates?.length
        ? {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeGeometry.coordinates
            },
            properties: {
              kind: 'route',
              deliveryId: delivery._id.toString(),
              provider: routeGeometry.metadata?.provider || 'fallback',
              distanceMeters: routeGeometry.metadata?.distanceMeters,
              durationSeconds: routeGeometry.metadata?.durationSeconds
            }
          }
        : null,
      pointFeature(driverLocation, {
        kind: 'driver',
        deliveryId: delivery._id.toString(),
        driverId: driverProfile?._id?.toString(),
        userId: driverProfile?.userId?.toString(),
        licenseNumber: driverProfile?.licenseNumber
      }),
      pointFeature(pickupLocation, {
        kind: 'pickup',
        orderId: order._id.toString(),
        vendorId: vendor?._id?.toString(),
        vendorName: vendor?.name
      }),
      pointFeature(destinationLocation, {
        kind: 'destination',
        orderId: order._id.toString()
      })
    ]);

    const distanceKm =
      driverLocation && destinationLocation
        ? haversineDistanceKm(driverLocation, destinationLocation)
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
        payableTotal: order.payableTotal ?? order.total,
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
      geojson: features as GeoFeatureCollection,
      realtime: {
        provider: 'socket.io',
        baseUrl: this.transportBaseUrl(),
        room: this.roomForDelivery(delivery._id.toString()),
        orderRoom: this.roomForOrder(order._id.toString())
      }
    };
  }

  async publishDeliverySnapshot(deliveryId: string) {
    const snapshot = await this.getDeliverySnapshot(deliveryId);
    await trackingGateway.publish(this.roomForDelivery(deliveryId), snapshot);
    await trackingGateway.publish(this.roomForOrder(snapshot.order.id), snapshot);
    return snapshot;
  }

  async publishForDriver(driverUserId: string) {
    const deliveries = await Delivery.find({
      driver: driverUserId,
      status: { $in: ['picked_up', 'in_transit'] }
    }).select('_id');

    for (const delivery of deliveries) {
      await this.publishDeliverySnapshot(delivery._id.toString());
    }
  }
}

export const deliveryTrackingService = new DeliveryTrackingService();
