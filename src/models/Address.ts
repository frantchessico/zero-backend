import { Schema } from "mongoose";
import { IAddress } from "./interfaces";


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
    }
  }, { _id: true });
  