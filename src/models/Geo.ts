import { Schema } from 'mongoose';

export const GeoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (value?: number[]) => !value || value.length === 2,
        message: 'GeoJSON Point must contain [longitude, latitude]'
      }
    }
  },
  { _id: false }
);

export const GeoLineStringSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]],
      default: undefined,
      validate: {
        validator: (value?: number[][]) =>
          !value || value.every((pair) => Array.isArray(pair) && pair.length === 2),
        message: 'GeoJSON LineString must contain coordinate pairs'
      }
    },
    metadata: {
      provider: { type: String },
      distanceMeters: { type: Number, min: 0 },
      durationSeconds: { type: Number, min: 0 }
    }
  },
  { _id: false }
);
