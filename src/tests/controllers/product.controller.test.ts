import { Request, Response } from 'express';
import ProductController from '../../core/product/product.controller';
import ProductService from '../../core/product/product.service';

jest.mock('../../core/product/product.service');

describe('ProductController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  const product = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Pizza Margherita',
    price: 25.99,
    vendor: 'vendor123',
    type: 'food',
    isAvailable: true,
    isPopular: false,
    rating: 4.5,
    reviewCount: 12,
  } as any;

  describe('getProductById', () => {
    it('deve retornar produto quando encontrado', async () => {
      mockRequest = { params: { id: 'product123' } };
      jest.spyOn(ProductService, 'getProductById').mockResolvedValue(product);

      await ProductController.getProductById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: product,
      });
    });

    it('deve retornar 404 quando produto não encontrado', async () => {
      mockRequest = { params: { id: 'missing' } };
      jest.spyOn(ProductService, 'getProductById').mockResolvedValue(null);

      await ProductController.getProductById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Produto não encontrado',
      });
    });
  });

  describe('getProducts', () => {
    it('deve retornar lista paginada de produtos', async () => {
      mockRequest = {
        query: {
          vendor: 'vendor123',
          type: 'food',
          page: '1',
          limit: '10',
          sortBy: 'price',
          sortOrder: 'asc',
        },
      };

      jest.spyOn(ProductService, 'getProducts').mockResolvedValue({
        products: [product],
        total: 1,
        totalPages: 1,
      });

      await ProductController.getProducts(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [product],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 10,
        },
      });
    });
  });

  describe('updateProduct', () => {
    it('deve atualizar produto com sucesso', async () => {
      const updated = { ...product, price: 31.5 };
      mockRequest = {
        params: { id: 'product123' },
        body: { price: 31.5 },
      };

      jest.spyOn(ProductService, 'updateProduct').mockResolvedValue(updated);

      await ProductController.updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: updated,
      });
    });

    it('deve retornar 404 quando produto não existe para atualização', async () => {
      mockRequest = {
        params: { id: 'missing' },
        body: { price: 31.5 },
      };

      jest.spyOn(ProductService, 'updateProduct').mockResolvedValue(null);

      await ProductController.updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Produto não encontrado',
      });
    });
  });

  describe('deleteProduct', () => {
    it('deve deletar produto com sucesso', async () => {
      mockRequest = { params: { id: 'product123' } };
      jest.spyOn(ProductService, 'deleteProduct').mockResolvedValue(true);

      await ProductController.deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Produto deletado com sucesso',
      });
    });

    it('deve retornar 404 quando produto não existe para deleção', async () => {
      mockRequest = { params: { id: 'missing' } };
      jest.spyOn(ProductService, 'deleteProduct').mockResolvedValue(false);

      await ProductController.deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Produto não encontrado',
      });
    });
  });

  describe('getProductsByVendor', () => {
    it('deve retornar produtos de um vendor', async () => {
      mockRequest = {
        params: { vendorId: 'vendor123' },
        query: { page: '1', limit: '10' },
      };

      jest.spyOn(ProductService, 'getProductsByVendor').mockResolvedValue({
        products: [product],
        total: 1,
      });

      await ProductController.getProductsByVendor(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [product],
        pagination: {
          currentPage: 1,
          totalItems: 1,
          itemsPerPage: 10,
        },
      });
    });
  });

  describe('searchProducts', () => {
    it('deve buscar produtos por termo', async () => {
      mockRequest = { query: { q: 'pizza' } };
      jest.spyOn(ProductService, 'searchProducts').mockResolvedValue([product]);

      await ProductController.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [product],
      });
    });

    it('deve validar ausência do parâmetro q', async () => {
      mockRequest = { query: {} };

      await ProductController.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Parâmetro de busca (q) é obrigatório',
      });
    });
  });

  describe('updateProductRating', () => {
    it('deve atualizar rating com sucesso', async () => {
      mockRequest = {
        params: { id: 'product123' },
        body: { rating: 5 },
      };

      jest.spyOn(ProductService, 'updateProductRating').mockResolvedValue({
        ...product,
        rating: 4.6,
        reviewCount: 13,
      } as any);

      await ProductController.updateProductRating(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Rating atualizado com sucesso',
        data: {
          id: product._id,
          rating: 4.6,
          reviewCount: 13,
        },
      });
    });

    it('deve validar rating inválido', async () => {
      mockRequest = {
        params: { id: 'product123' },
        body: { rating: 10 },
      };

      await ProductController.updateProductRating(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Rating deve ser um número entre 0 e 5',
      });
    });
  });

  describe('toggleAvailability', () => {
    it('deve alternar disponibilidade do produto', async () => {
      mockRequest = { params: { id: 'product123' } };
      jest.spyOn(ProductService, 'getProductById').mockResolvedValue(product);
      jest.spyOn(ProductService, 'updateProduct').mockResolvedValue({
        ...product,
        isAvailable: false,
      } as any);

      await ProductController.toggleAvailability(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Produto indisponibilizado com sucesso',
        data: {
          ...product,
          isAvailable: false,
        },
      });
    });
  });
});
