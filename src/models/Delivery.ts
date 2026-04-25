import { Schema, Types, model } from "mongoose";
import { GeoLineStringSchema, GeoPointSchema } from "./Geo";

export const DeliverySchema = new Schema({
    order: { type: Types.ObjectId, ref: 'Order', required: true },
    driver: { type: Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['picked_up', 'in_transit', 'delivered', 'failed'], default: 'picked_up' },
    currentLocation: {
      lat: Number,
      lng: Number
    },
    currentLocationGeo: {
      type: GeoPointSchema,
      required: false
    },
    failureReason: { type: String },
    route: { type: Types.ObjectId, ref: 'Route' },
    routeGeometry: {
      type: GeoLineStringSchema,
      required: false
    },
    assignedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
    estimatedTime: Date
  }, {
    timestamps: true
  });

  DeliverySchema.pre('validate', function (next) {
    if (
      this.currentLocation &&
      Number.isFinite(this.currentLocation.lat) &&
      Number.isFinite(this.currentLocation.lng)
    ) {
      this.currentLocationGeo = {
        type: 'Point',
        coordinates: [this.currentLocation.lng, this.currentLocation.lat]
      } as any;
    }

    next();
  });

  DeliverySchema.index({ driver: 1, status: 1 });
  DeliverySchema.index({ route: 1 });
  DeliverySchema.index({ currentLocationGeo: '2dsphere' });
  
  export const Delivery = model('Delivery', DeliverySchema);
  
