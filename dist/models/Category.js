"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = require("mongoose");
const CategorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false,
        trim: true
    },
    type: {
        type: String,
        enum: ['food', 'medicine', 'appliance', 'service'],
        required: true
    },
    iconUrl: {
        type: String,
        required: false
    },
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: false
    }
}, { timestamps: true });
CategorySchema.index({ name: 1, type: 1 });
exports.Category = (0, mongoose_1.model)('Category', CategorySchema);
