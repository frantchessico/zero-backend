import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { Vendor } from '../../models/Vendor';
import { Delivery } from '../../models/Delivery';
import { Category } from '../../models/Category';
import { logger } from '../../utils/logger';

/**
 * Service para consultas otimizadas com populate
 */
export class QueryService {
  
  /**
   * Buscar usuário com todos os relacionamentos
   */
  static async getUserWithRelations(userId: string) {
    try {
      const user = await User.findById(userId)
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
    } catch (error) {
      logger.error('Error fetching user with relations:', error);
      throw error;
    }
  }

  /**
   * Buscar pedido com todos os relacionamentos
   */
  static async getOrderWithRelations(orderId: string) {
    try {
      const order = await Order.findById(orderId)
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
    } catch (error) {
      logger.error('Error fetching order with relations:', error);
      throw error;
    }
  }

  /**
   * Buscar produtos com vendor e categoria
   */
  static async getProductsWithRelations(filters: any = {}, options: any = {}) {
    try {
      const query = Product.find(filters)
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

      const products = await query.exec();
      return products;
    } catch (error) {
      logger.error('Error fetching products with relations:', error);
      throw error;
    }
  }

  /**
   * Buscar vendor com produtos e estatísticas
   */
  static async getVendorWithRelations(vendorId: string) {
    try {
      const vendor = await Vendor.findById(vendorId)
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
        const stats = await this.getVendorStats(vendorId);
        return { ...vendor.toObject(), stats };
      }

      return vendor;
    } catch (error) {
      logger.error('Error fetching vendor with relations:', error);
      throw error;
    }
  }

  /**
   * Buscar delivery com order e driver
   */
  static async getDeliveryWithRelations(deliveryId: string) {
    try {
      const delivery = await Delivery.findById(deliveryId)
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
    } catch (error) {
      logger.error('Error fetching delivery with relations:', error);
      throw error;
    }
  }

  /**
   * Buscar todos os pedidos de um usuário com relacionamentos
   */
  static async getUserOrders(userId: string, options: any = {}) {
    try {
      const query = Order.find({ customer: userId })
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
      } else {
        query.sort({ createdAt: -1 });
      }

      if (options.limit) {
        query.limit(options.limit);
      }

      if (options.skip) {
        query.skip(options.skip);
      }

      const orders = await query.exec();
      return orders;
    } catch (error) {
      logger.error('Error fetching user orders:', error);
      throw error;
    }
  }

  /**
   * Buscar produtos de um vendor com categoria
   */
  static async getVendorProducts(vendorId: string, options: any = {}) {
    try {
      const query = Product.find({ vendor: vendorId })
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
      } else {
        query.sort({ isPopular: -1, name: 1 });
      }

      if (options.limit) {
        query.limit(options.limit);
      }

      if (options.skip) {
        query.skip(options.skip);
      }

      const products = await query.exec();
      return products;
    } catch (error) {
      logger.error('Error fetching vendor products:', error);
      throw error;
    }
  }

  /**
   * Buscar deliveries de um driver
   */
  static async getDriverDeliveries(driverId: string, options: any = {}) {
    try {
      const query = Delivery.find({ driver: driverId })
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
      } else {
        query.sort({ createdAt: -1 });
      }

      if (options.limit) {
        query.limit(options.limit);
      }

      if (options.skip) {
        query.skip(options.skip);
      }

      const deliveries = await query.exec();
      return deliveries;
    } catch (error) {
      logger.error('Error fetching driver deliveries:', error);
      throw error;
    }
  }

  /**
   * Buscar estatísticas de um vendor
   */
  static async getVendorStats(vendorId: string) {
    try {
      const [totalProducts, availableProducts, totalOrders, completedOrders] = await Promise.all([
        Product.countDocuments({ vendor: vendorId }),
        Product.countDocuments({ vendor: vendorId, isAvailable: true }),
        Order.countDocuments({ vendor: vendorId }),
        Order.countDocuments({ vendor: vendorId, status: 'delivered' })
      ]);

      return {
        totalProducts,
        availableProducts,
        totalOrders,
        completedOrders,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
      };
    } catch (error) {
      logger.error('Error fetching vendor stats:', error);
      throw error;
    }
  }

  /**
   * Buscar produtos populares com vendor
   */
  static async getPopularProducts(limit: number = 10) {
    try {
      const products = await Product.find({ isPopular: true, isAvailable: true })
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
    } catch (error) {
      logger.error('Error fetching popular products:', error);
      throw error;
    }
  }

  /**
   * Buscar categorias com contagem de produtos
   */
  static async getCategoriesWithCount() {
    try {
      const categories = await Category.aggregate([
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
    } catch (error) {
      logger.error('Error fetching categories with count:', error);
      throw error;
    }
  }

  /**
   * Buscar dashboard data para admin
   */
  static async getDashboardData() {
    try {
      const [
        totalUsers,
        totalVendors,
        totalProducts,
        totalOrders,
        recentOrders,
        topVendors
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        Vendor.countDocuments({ status: 'active' }),
        Product.countDocuments({ isAvailable: true }),
        Order.countDocuments(),
        Order.find()
          .populate('customer', 'userId')
          .populate('vendor', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
          .exec(),
        Vendor.aggregate([
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
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
} 