import { Schema } from "mongoose";
import { IAddress } from "./interfaces";
import { GeoPointSchema } from "./Geo";


  export const AddressSchema = new Schema<IAddress>({
    streetType:     { type: String, required: true },
    streetName:     { type: String, required: true },
    number:         { type: String, required: true },
    neighborhood:       { type: String, required: false },
    city:           { type: String, required: true },
    province:       { type: String, required: true },
    country:        { type: String, required: true, default: 'Mozambique' },
    postalCode:     { type: String, required: false },
    referencePoint: { type: String, required: false },
    additionalInfo: { type: String, required: false },
    label:          { type: String, enum: ['Home', 'Work', 'Other'], required: false },
    coordinates: {
      lat: { type: Number, required: false },
      lng: { type: Number, required: false }
    },
    geoPoint: {
      type: GeoPointSchema,
      required: false
    }
  }, { _id: true });

  AddressSchema.pre('validate', function (next) {
    if (this.coordinates?.lat !== undefined && this.coordinates?.lng !== undefined) {
      this.geoPoint = {
        type: 'Point',
        coordinates: [this.coordinates.lng, this.coordinates.lat]
      } as any;
    } else if (this.geoPoint?.coordinates?.length === 2) {
      const [lng, lat] = this.geoPoint.coordinates;
      this.coordinates = { lat, lng } as any;
    }

    next();
  });

  AddressSchema.virtual('street').get(function () {
    return [this.streetType, this.streetName].filter(Boolean).join(' ').trim();
  });

  AddressSchema.set('toJSON', { virtuals: true });
  AddressSchema.set('toObject', { virtuals: true });
  
