
import ProductModel, { IProduct } from '../../models/Product';
import { Types } from 'mongoose';

export interface CreateProductDTO {
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  categoryId?: string;
  vendor: string;
  imageUrl?: string;
  type: 'food' | 'medicine' | 'appliance' | 'service';
  isAvailable?: boolean;
  isPopular?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  preparationTime?: number;
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  ingredients?: string[];
  tags?: string[];
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

export interface ProductFilters {
  vendor?: string;
  categoryId?: string;
  type?: 'food' | 'medicine' | 'appliance' | 'service';
  isAvailable?: boolean;
  isPopular?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
  allergens?: string[];
}

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class ProductService {
  async createProduct(productData: CreateProductDTO): Promise<IProduct> {
    try {
      const product = new ProductModel({
        ...productData,
        vendor: new Types.ObjectId(productData.vendor),
        categoryId: productData.categoryId ? new Types.ObjectId(productData.categoryId) : undefined,
      });

      return await product.save();
    } catch (error: any) {
      throw new Error(`Erro ao criar produto: ${error.message}`);
    }
  }

  async getProductById(id: string): Promise<IProduct | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('ID inválido');
      }

      return await ProductModel.findById(id)
        .populate('vendor', 'name email businessName')
        .populate('categoryId', 'name description')
        .exec();
    } catch (error: any) {
      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }
  }

  async getProducts(
    filters: ProductFilters = {},
    options: ProductQueryOptions = {}
  ): Promise<{ products: IProduct[]; total: number; totalPages: number }> {
    try {
      const {
        vendor,
        categoryId,
        type,
        isAvailable,
        isPopular,
        isVegetarian,
        isVegan,
        isGlutenFree,
        isSpicy,
        minPrice,
        maxPrice,
        search,
        tags,
        allergens
      } = filters;

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Construir query de filtros
      const query: any = {};

      if (vendor) query.vendor = new Types.ObjectId(vendor);
      if (categoryId) query.categoryId = new Types.ObjectId(categoryId);
      if (type) query.type = type;
      if (typeof isAvailable === 'boolean') query.isAvailable = isAvailable;
      if (typeof isPopular === 'boolean') query.isPopular = isPopular;
      if (typeof isVegetarian === 'boolean') query.isVegetarian = isVegetarian;
      if (typeof isVegan === 'boolean') query.isVegan = isVegan;
      if (typeof isGlutenFree === 'boolean') query.isGlutenFree = isGlutenFree;
      if (typeof isSpicy === 'boolean') query.isSpicy = isSpicy;

      // Filtro de preço
      if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) query.price.$gte = minPrice;
        if (maxPrice !== undefined) query.price.$lte = maxPrice;
      }

      // Busca por texto
      if (search) {
        query.$text = { $search: search };
      }

      // Filtro por tags
      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      // Filtro por alérgenos (produtos que NÃO contenham os alérgenos especificados)
      if (allergens && allergens.length > 0) {
        query.allergens = { $nin: allergens };
      }

      // Configurar ordenação
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Executar query com paginação
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        ProductModel.find(query)
          .populate('vendor', 'name email businessName')
          .populate('categoryId', 'name description')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        ProductModel.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return { products, total, totalPages };
    } catch (error: any) {
      throw new Error(`Erro ao buscar produtos: ${error.message}`);
    }
  }

  async updateProduct(id: string, updateData: UpdateProductDTO): Promise<IProduct | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('ID inválido');
      }

      const updatePayload: any = { ...updateData };
      
      if (updateData.vendor) {
        updatePayload.vendor = new Types.ObjectId(updateData.vendor);
      }
      
      if (updateData.categoryId) {
        updatePayload.categoryId = new Types.ObjectId(updateData.categoryId);
      }

      return await ProductModel.findByIdAndUpdate(
        id,
        updatePayload,
        { new: true, runValidators: true }
      )
        .populate('vendor', 'name email businessName')
        .populate('categoryId', 'name description')
        .exec();
    } catch (error: any) {
      throw new Error(`Erro ao atualizar produto: ${error.message}`);
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('ID inválido');
      }

      const result = await ProductModel.findByIdAndDelete(id);
      return !!result;
    } catch (error: any) {
      throw new Error(`Erro ao deletar produto: ${error.message}`);
    }
  }

  async getProductsByVendor(vendorId: string, options: ProductQueryOptions = {}): Promise<{ products: IProduct[]; total: number }> {
    try {
      if (!Types.ObjectId.isValid(vendorId)) {
        throw new Error('ID do vendor inválido');
      }

      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [products, total] = await Promise.all([
        ProductModel.find({ vendor: new Types.ObjectId(vendorId) })
          .populate('categoryId', 'name description')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        ProductModel.countDocuments({ vendor: new Types.ObjectId(vendorId) })
      ]);

      return { products, total };
    } catch (error: any) {
      throw new Error(`Erro ao buscar produtos do vendor: ${error.message}`);
    }
  }

  async getProductsByCategory(categoryId: string, options: ProductQueryOptions = {}): Promise<{ products: IProduct[]; total: number }> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new Error('ID da categoria inválido');
      }

      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [products, total] = await Promise.all([
        ProductModel.find({ categoryId: new Types.ObjectId(categoryId), isAvailable: true })
          .populate('vendor', 'name email businessName')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        ProductModel.countDocuments({ categoryId: new Types.ObjectId(categoryId), isAvailable: true })
      ]);

      return { products, total };
    } catch (error: any) {
      throw new Error(`Erro ao buscar produtos da categoria: ${error.message}`);
    }
  }

  async getPopularProducts(limit: number = 10): Promise<IProduct[]> {
    try {
      return await ProductModel.find({ isPopular: true, isAvailable: true })
        .populate('vendor', 'name email businessName')
        .populate('categoryId', 'name description')
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limit)
        .exec();
    } catch (error: any) {
      throw new Error(`Erro ao buscar produtos populares: ${error.message}`);
    }
  }

  async updateProductRating(id: string, rating: number, increment: boolean = true): Promise<IProduct | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('ID inválido');
      }

      if (rating < 0 || rating > 5) {
        throw new Error('Rating deve estar entre 0 e 5');
      }

      const product = await ProductModel.findById(id);
      if (!product) {
        throw new Error('Produto não encontrado');
      }

      let newRating: number;
      let newReviewCount: number;

      if (increment) {
        // Adicionar nova avaliação
        const totalRating = (product.rating || 0) * (product.reviewCount || 0);
        newReviewCount = (product.reviewCount || 0) + 1;
        newRating = (totalRating + rating) / newReviewCount;
      } else {
        // Definir rating diretamente (para casos especiais)
        newRating = rating;
        newReviewCount = product.reviewCount || 0;
      }

      return await ProductModel.findByIdAndUpdate(
        id,
        {
          rating: Math.round(newRating * 10) / 10, // Arredondar para 1 casa decimal
          reviewCount: newReviewCount
        },
        { new: true }
      ).exec();
    } catch (error: any) {
      throw new Error(`Erro ao atualizar rating do produto: ${error.message}`);
    }
  }

  async searchProducts(searchTerm: string, filters: ProductFilters = {}): Promise<IProduct[]> {
    try {
      const query: any = {
        $text: { $search: searchTerm },
        isAvailable: true,
        ...filters
      };

      return await ProductModel.find(query)
        .populate('vendor', 'name email businessName')
        .populate('categoryId', 'name description')
        .sort({ score: { $meta: 'textScore' }, rating: -1 })
        .limit(20)
        .exec();
    } catch (error: any) {
      throw new Error(`Erro ao buscar produtos: ${error.message}`);
    }
  }
}

export default new ProductService();