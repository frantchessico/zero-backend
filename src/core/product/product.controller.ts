// controllers/productController.ts
import { Request, Response } from 'express';
import ProductService, { CreateProductDTO, UpdateProductDTO, ProductFilters, ProductQueryOptions } from './product.service';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';
import { logger } from '../../utils/logger';

class ProductController {
  /**
   * POST /products/my-products - Criar produto para vendor autenticado
   */
  async createMyProduct(req: Request, res: Response): Promise<void> {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem criar produtos'
        });
        return;
      }

      // Buscar vendor do usuário
      const vendor = await Vendor.findOne({ owner: user._id });
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este usuário'
        });
        return;
      }

      const productData: CreateProductDTO = {
        ...req.body,
        vendor: vendor._id.toString() // Usar vendor do usuário autenticado
      };
      
      // Validações básicas
      if (!productData.name || !productData.price || !productData.type) {
        res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: name, price, type'
        });
        return;
      }

      const product = await ProductService.createProduct(productData);
      
      res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
        data: product
      });
    } catch (error: any) {
      logger.error('Error creating my product:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar produto'
      });
    }
  }

  /**
   * GET /products/my-products - Listar produtos do vendor autenticado
   */
  async getMyProducts(req: Request, res: Response): Promise<void> {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem acessar esta funcionalidade'
        });
        return;
      }

      // Buscar vendor do usuário
      const vendor = await Vendor.findOne({ owner: user._id });
      if (!vendor) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este usuário'
        });
        return;
      }

      const filters: ProductFilters = {
        vendor: vendor._id.toString(),
        isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
        type: req.query.type as 'food' | 'medicine' | 'appliance' | 'service',
        search: req.query.search as string
      };

      const options: ProductQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await ProductService.getProducts(filters, options);
      
      res.status(200).json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: options.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: options.limit
        }
      });
    } catch (error: any) {
      logger.error('Error fetching my products:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar produtos'
      });
    }
  }

  /**
   * PUT /products/my-products/:id - Atualizar produto do vendor autenticado
   */
  async updateMyProduct(req: Request, res: Response): Promise<void> {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem atualizar produtos'
        });
        return;
      }

      const { id } = req.params;
      const updateData: UpdateProductDTO = req.body;

      // Verificar se o produto pertence ao vendor
      const product = await ProductService.getProductById(id);
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
        return;
      }

      // Buscar vendor do usuário
      const vendor = await Vendor.findOne({ owner: user._id });
      if (!vendor || product.vendor.toString() !== vendor._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para atualizar este produto'
        });
        return;
      }

      const updatedProduct = await ProductService.updateProduct(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: updatedProduct
      });
    } catch (error: any) {
      logger.error('Error updating my product:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar produto'
      });
    }
  }

  // Buscar produto por ID
  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Listar produtos com filtros e paginação
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const filters: ProductFilters = {
        vendor: req.query.vendor as string,
        categoryId: req.query.categoryId as string,
        type: req.query.type as 'food' | 'medicine' | 'appliance' | 'service',
        isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
        isPopular: req.query.isPopular ? req.query.isPopular === 'true' : undefined,
        isVegetarian: req.query.isVegetarian ? req.query.isVegetarian === 'true' : undefined,
        isVegan: req.query.isVegan ? req.query.isVegan === 'true' : undefined,
        isGlutenFree: req.query.isGlutenFree ? req.query.isGlutenFree === 'true' : undefined,
        isSpicy: req.query.isSpicy ? req.query.isSpicy === 'true' : undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        allergens: req.query.allergens ? (req.query.allergens as string).split(',') : undefined,
      };

      const options: ProductQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await ProductService.getProducts(filters, options);
      
      res.status(200).json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: options.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: options.limit
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Atualizar produto
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateProductDTO = req.body;
      
      const product = await ProductService.updateProduct(id, updateData);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: product
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Deletar produto
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await ProductService.deleteProduct(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Produto deletado com sucesso'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Buscar produtos por vendor
  async getProductsByVendor(req: Request, res: Response): Promise<void> {
    try {
      const { vendorId } = req.params;
      
      const options: ProductQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await ProductService.getProductsByVendor(vendorId, options);
      
      res.status(200).json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: options.page,
          totalItems: result.total,
          itemsPerPage: options.limit
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Buscar produtos por categoria
  async getProductsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId } = req.params;
      
      const options: ProductQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await ProductService.getProductsByCategory(categoryId, options);
      
      res.status(200).json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: options.page,
          totalItems: result.total,
          itemsPerPage: options.limit
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Buscar produtos populares
  async getPopularProducts(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const products = await ProductService.getPopularProducts(limit);
      
      res.status(200).json({
        success: true,
        data: products
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Buscar produtos por texto
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Parâmetro de busca (q) é obrigatório'
        });
        return;
      }

      const filters: ProductFilters = {
        type: req.query.type as 'food' | 'medicine' | 'appliance' | 'service',
        vendor: req.query.vendor as string,
        categoryId: req.query.categoryId as string,
      };

      const products = await ProductService.searchProducts(q, filters);
      
      res.status(200).json({
        success: true,
        data: products
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Atualizar rating do produto
  async updateProductRating(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      
      if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating deve ser um número entre 0 e 5'
        });
        return;
      }

      const product = await ProductService.updateProductRating(id, rating);
      
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Rating atualizado com sucesso',
        data: {
          id: product._id,
          rating: product.rating,
          reviewCount: product.reviewCount
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Alternar disponibilidade do produto
  async toggleAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const product = await ProductService.getProductById(id);
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
        return;
      }

      const updatedProduct = await ProductService.updateProduct(id, {
        isAvailable: !product.isAvailable
      });

      res.status(200).json({
        success: true,
        message: `Produto ${updatedProduct?.isAvailable ? 'disponibilizado' : 'indisponibilizado'} com sucesso`,
        data: updatedProduct
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Alternar popularidade do produto
  async togglePopular(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const product = await ProductService.getProductById(id);
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
        return;
      }

      const updatedProduct = await ProductService.updateProduct(id, {
        isPopular: !product.isPopular
      });

      res.status(200).json({
        success: true,
        message: `Produto ${updatedProduct?.isPopular ? 'marcado como popular' : 'desmarcado como popular'}`,
        data: updatedProduct
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new ProductController();