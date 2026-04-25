"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryService = void 0;
const User_1 = require("../../models/User");
const Order_1 = require("../../models/Order");
const Product_1 = __importDefault(require("../../models/Product"));
const Vendor_1 = require("../../models/Vendor");
const Delivery_1 = require("../../models/Delivery");
const Category_1 = require("../../models/Category");
const logger_1 = require("../../utils/logger");
/**
 * Service para consultas otimizadas com populate
 */
class QueryService {
    /**
     * Buscar usuário com todos os relacionamentos
     */
    static getUserWithRelations(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield User_1.User.findById(userId)
                    .populate({
                    path: 'orderHistory',
                    populate: [
                        {
                            path: 'vendor',
                            select: 'name type address status'
                        },
                        {
                            path: 'items.product',
                            select: 'name price type isAvailable'
                        }
                    ]
                })
                    .populate({
                    path: 'deliveryAddresses'
                })
                    .exec();
                return user;
            }
            catch (error) {
                logger_1.logger.error('Error fetching user with relations:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar pedido com todos os relacionamentos
     */
    static getOrderWithRelations(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield Order_1.Order.findById(orderId)
                    .populate({
                    path: 'customer',
                    select: 'userId email phoneNumber deliveryAddresses'
                })
                    .populate({
                    path: 'vendor',
                    select: 'name type address status workingHours'
                })
                    .populate({
                    path: 'items.product',
                    select: 'name price type description isAvailable'
                })
                    .populate({
                    path: 'delivery',
                    select: 'status currentLocation estimatedTime driver'
                })
                    .exec();
                return order;
            }
            catch (error) {
                logger_1.logger.error('Error fetching order with relations:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar produtos com vendor e categoria
     */
    static getProductsWithRelations() {
        return __awaiter(this, arguments, void 0, function* (filters = {}, options = {}) {
            try {
                const query = Product_1.default.find(filters)
                    .populate({
                    path: 'vendor',
                    select: 'name type address status workingHours'
                })
                    .populate({
                    path: 'categoryId',
                    select: 'name description type'
                });
                if (options.sort) {
                    query.sort(options.sort);
                }
                if (options.limit) {
                    query.limit(options.limit);
                }
                if (options.skip) {
                    query.skip(options.skip);
                }
                const products = yield query.exec();
                return products;
            }
            catch (error) {
                logger_1.logger.error('Error fetching products with relations:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar vendor com produtos e estatísticas
     */
    static getVendorWithRelations(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const vendor = yield Vendor_1.Vendor.findById(vendorId)
                    .populate({
                    path: 'owner',
                    select: 'userId email phoneNumber'
                })
                    .populate({
                    path: 'products',
                    select: 'name price type isAvailable rating',
                    match: { isAvailable: true }
                })
                    .exec();
                // Adicionar estatísticas
                if (vendor) {
                    const stats = yield this.getVendorStats(vendorId);
                    return Object.assign(Object.assign({}, vendor.toObject()), { stats });
                }
                return vendor;
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor with relations:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar delivery com order e driver
     */
    static getDeliveryWithRelations(deliveryId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const delivery = yield Delivery_1.Delivery.findById(deliveryId)
                    .populate({
                    path: 'order',
                    populate: [
                        {
                            path: 'customer',
                            select: 'userId email phoneNumber'
                        },
                        {
                            path: 'vendor',
                            select: 'name address'
                        },
                        {
                            path: 'items.product',
                            select: 'name price'
                        }
                    ]
                })
                    .populate({
                    path: 'driver',
                    select: 'userId email phoneNumber'
                })
                    .exec();
                return delivery;
            }
            catch (error) {
                logger_1.logger.error('Error fetching delivery with relations:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar todos os pedidos de um usuário com relacionamentos
     */
    static getUserOrders(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, options = {}) {
            try {
                const query = Order_1.Order.find({ customer: userId })
                    .populate({
                    path: 'vendor',
                    select: 'name type address'
                })
                    .populate({
                    path: 'items.product',
                    select: 'name price type'
                })
                    .populate({
                    path: 'delivery',
                    select: 'status currentLocation estimatedTime'
                });
                if (options.status) {
                    query.where('status', options.status);
                }
                if (options.sort) {
                    query.sort(options.sort);
                }
                else {
                    query.sort({ createdAt: -1 });
                }
                if (options.limit) {
                    query.limit(options.limit);
                }
                if (options.skip) {
                    query.skip(options.skip);
                }
                const orders = yield query.exec();
                return orders;
            }
            catch (error) {
                logger_1.logger.error('Error fetching user orders:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar produtos de um vendor com categoria
     */
    static getVendorProducts(vendorId_1) {
        return __awaiter(this, arguments, void 0, function* (vendorId, options = {}) {
            try {
                const query = Product_1.default.find({ vendor: vendorId })
                    .populate({
                    path: 'categoryId',
                    select: 'name description'
                });
                if (options.isAvailable !== undefined) {
                    query.where('isAvailable', options.isAvailable);
                }
                if (options.type) {
                    query.where('type', options.type);
                }
                if (options.sort) {
                    query.sort(options.sort);
                }
                else {
                    query.sort({ isPopular: -1, name: 1 });
                }
                if (options.limit) {
                    query.limit(options.limit);
                }
                if (options.skip) {
                    query.skip(options.skip);
                }
                const products = yield query.exec();
                return products;
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor products:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar deliveries de um driver
     */
    static getDriverDeliveries(driverId_1) {
        return __awaiter(this, arguments, void 0, function* (driverId, options = {}) {
            try {
                const query = Delivery_1.Delivery.find({ driver: driverId })
                    .populate({
                    path: 'order',
                    populate: [
                        {
                            path: 'customer',
                            select: 'userId phoneNumber'
                        },
                        {
                            path: 'vendor',
                            select: 'name address'
                        }
                    ]
                });
                if (options.status) {
                    query.where('status', options.status);
                }
                if (options.sort) {
                    query.sort(options.sort);
                }
                else {
                    query.sort({ createdAt: -1 });
                }
                if (options.limit) {
                    query.limit(options.limit);
                }
                if (options.skip) {
                    query.skip(options.skip);
                }
                const deliveries = yield query.exec();
                return deliveries;
            }
            catch (error) {
                logger_1.logger.error('Error fetching driver deliveries:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar estatísticas de um vendor
     */
    static getVendorStats(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [totalProducts, availableProducts, totalOrders, completedOrders] = yield Promise.all([
                    Product_1.default.countDocuments({ vendor: vendorId }),
                    Product_1.default.countDocuments({ vendor: vendorId, isAvailable: true }),
                    Order_1.Order.countDocuments({ vendor: vendorId }),
                    Order_1.Order.countDocuments({ vendor: vendorId, status: 'delivered' })
                ]);
                return {
                    totalProducts,
                    availableProducts,
                    totalOrders,
                    completedOrders,
                    completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
                };
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor stats:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar produtos populares com vendor
     */
    static getPopularProducts() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            try {
                const products = yield Product_1.default.find({ isPopular: true, isAvailable: true })
                    .populate({
                    path: 'vendor',
                    select: 'name type address'
                })
                    .populate({
                    path: 'categoryId',
                    select: 'name'
                })
                    .sort({ rating: -1, reviewCount: -1 })
                    .limit(limit)
                    .exec();
                return products;
            }
            catch (error) {
                logger_1.logger.error('Error fetching popular products:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar categorias com contagem de produtos
     */
    static getCategoriesWithCount() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const categories = yield Category_1.Category.aggregate([
                    {
                        $lookup: {
                            from: 'products',
                            localField: '_id',
                            foreignField: 'categoryId',
                            as: 'products'
                        }
                    },
                    {
                        $addFields: {
                            productCount: { $size: '$products' }
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            description: 1,
                            type: 1,
                            productCount: 1
                        }
                    },
                    {
                        $sort: { productCount: -1 }
                    }
                ]);
                return categories;
            }
            catch (error) {
                logger_1.logger.error('Error fetching categories with count:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar dashboard data para admin
     */
    static getDashboardData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [totalUsers, totalVendors, totalProducts, totalOrders, recentOrders, topVendors] = yield Promise.all([
                    User_1.User.countDocuments({ isActive: true }),
                    Vendor_1.Vendor.countDocuments({ status: 'active' }),
                    Product_1.default.countDocuments({ isAvailable: true }),
                    Order_1.Order.countDocuments(),
                    Order_1.Order.find()
                        .populate('customer', 'userId')
                        .populate('vendor', 'name')
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .exec(),
                    Vendor_1.Vendor.aggregate([
                        { $match: { status: 'active' } },
                        {
                            $lookup: {
                                from: 'orders',
                                localField: '_id',
                                foreignField: 'vendor',
                                as: 'orders'
                            }
                        },
                        {
                            $addFields: {
                                orderCount: { $size: '$orders' }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                type: 1,
                                orderCount: 1
                            }
                        },
                        { $sort: { orderCount: -1 } },
                        { $limit: 5 }
                    ])
                ]);
                return {
                    totalUsers,
                    totalVendors,
                    totalProducts,
                    totalOrders,
                    recentOrders,
                    topVendors
                };
            }
            catch (error) {
                logger_1.logger.error('Error fetching dashboard data:', error);
                throw error;
            }
        });
    }
}
exports.QueryService = QueryService;
