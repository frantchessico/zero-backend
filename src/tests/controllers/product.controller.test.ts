import { Request, Response } from 'express';
import ProductController from '../../core/product/product.controller';
import ProductService from '../../core/product/product.service';

// Mock do ProductService
jest.mock('../../core/product/product.service');

describe('ProductController', () => {
  let productController: ProductController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    productController = new ProductController();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('createProduct', () => {
    it('deve criar produto com sucesso', async () => {
      // Arrange
      const productData = {
        name: 'Pizza Margherita',
        price: 25.99,
        vendor: 'vendor123',
        type: 'food',
        description: 'Pizza tradicional italiana',
        categoryId: 'category123'
      };

      const createdProduct = {
        _id: '507f1f77bcf86cd799439011',
        ...productData,
        isAvailable: true,
        rating: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest = {
        body: productData
      };

      // Mock do service
      jest.spyOn(ProductService, 'createProduct')
        .mockResolvedValue(createdProduct);

      // Act
      await productController.createProduct(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Produto criado com sucesso',
        data: createdProduct
      });
    });

    it('deve retornar erro 400 quando campos obrigatórios estão faltando', async () => {
      // Arrange
      const productData = {
        name: 'Pizza Margherita',
        price: 25.99
        // Faltando vendor e type
      };

      mockRequest = {
        body: productData
      };

      // Act
      await productController.createProduct(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Campos obrigatórios: name, price, vendor, type'
      });
    });

    it('deve retornar erro 400 quando price é inválido', async () => {
      // Arrange
      const productData = {
        name: 'Pizza Margherita',
        price: -10, // Preço negativo
        vendor: 'vendor123',
        type: 'food'
      };

      mockRequest = {
        body: productData
      };

      // Act
      await productController.createProduct(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Preço deve ser um valor positivo'
      });
    });
  });

  describe('getProductById', () => {
    it('deve retornar produto quando encontrado', async () => {
      // Arrange
      const productId = 'product123';
      const product = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Pizza Margherita',
        price: 25.99,
        vendor: 'vendor123',
        type: 'food',
        isAvailable: true
      };

      mockRequest = {
        params: { id: productId }
      };

      // Mock do service
      jest.spyOn(ProductService, 'getProductById')
        .mockResolvedValue(product);

      // Act
      await productController.getProductById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: product
      });
    });

    it('deve retornar 404 quando produto não encontrado', async () => {
      // Arrange
      const productId = 'nonexistent';

      mockRequest = {
        params: { id: productId }
      };

      // Mock do service retornando null
      jest.spyOn(ProductService, 'getProductById')
        .mockResolvedValue(null);

      // Act
      await productController.getProductById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Produto não encontrado'
      });
    });
  });

  describe('getProducts', () => {
    it('deve retornar lista de produtos com filtros', async () => {
      // Arrange
      const products = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Pizza Margherita',
          price: 25.99,
          vendor: 'vendor123',
          type: 'food',
          isAvailable: true
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Hambúrguer',
          price: 15.99,
          vendor: 'vendor123',
          type: 'food',
          isAvailable: true
        }
      ];

      const result = {
        products,
        total: 2,
        totalPages: 1,
        currentPage: 1
      };

      mockRequest = {
        query: {
          vendor: 'vendor123',
          type: 'food',
          page: '1',
          limit: '10',
          sortBy: 'price',
          sortOrder: 'asc'
        }
      };

      // Mock do service
      jest.spyOn(ProductService, 'getProducts')
        .mockResolvedValue(result);

      // Act
      await productController.getProducts(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: products,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          itemsPerPage: 10
        }
      });
    });

    it('deve aplicar filtros de preço corretamente', async () => {
      // Arrange
      const products = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Pizza Margherita',
          price: 25.99,
          vendor: 'vendor123',
          type: 'food',
          isAvailable: true
        }
      ];

      const result = {
        products,
        total: 1,
        totalPages: 1,
        currentPage: 1
      };

      mockRequest = {
        query: {
          minPrice: '20',
          maxPrice: '30',
          page: '1',
          limit: '10'
        }
      };

      // Mock do service
      jest.spyOn(ProductService, 'getProducts')
        .mockResolvedValue(result);

      // Act
      await productController.getProducts(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: products,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 10
        }
      });
    });
  });

  describe('updateProduct', () => {
    it('deve atualizar produto com sucesso', async () => {
      // Arrange
      const productId = 'product123';
      const updateData = {
        name: 'Pizza Margherita Especial',
        price: 29.99,
        description: 'Pizza com ingredientes premium'
      };

      const updatedProduct = {
        _id: '507f1f77bcf86cd799439011',
        ...updateData,
        vendor: 'vendor123',
        type: 'food',
        isAvailable: true
      };

      mockRequest = {
        params: { id: productId },
        body: updateData
      };

      // Mock do service
      jest.spyOn(ProductService, 'updateProduct')
        .mockResolvedValue(updatedProduct);

      // Act
      await productController.updateProduct(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: updatedProduct
      });
    });

    it('deve retornar 404 quando produto não encontrado para atualização', async () => {
      // Arrange
      const productId = 'nonexistent';
      const updateData = {
        name: 'Pizza Margherita Especial'
      };

      mockRequest = {
        params: { id: productId },
        body: updateData
      };

      // Mock do service retornando null
      jest.spyOn(ProductService, 'updateProduct')
        .mockResolvedValue(null);

      // Act
      await productController.updateProduct(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Produto não encontrado'
      });
    });
  });

  describe('deleteProduct', () => {
    it('deve deletar produto com sucesso', async () => {
      // Arrange
      const productId = 'product123';

      mockRequest = {
        params: { id: productId }
      };

      // Mock do service
      jest.spyOn(ProductService, 'deleteProduct')
        .mockResolvedValue(true);

      // Act
      await productController.deleteProduct(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Produto deletado com sucesso'
      });
    });

    it('deve retornar 404 quando produto não encontrado para deletar', async () => {
      // Arrange
      const productId = 'nonexistent';

      mockRequest = {
        params: { id: productId }
      };

      // Mock do service retornando false
      jest.spyOn(ProductService, 'deleteProduct')
        .mockResolvedValue(false);

      // Act
      await productController.deleteProduct(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Produto não encontrado'
      });
    });
  });

  describe('getProductsByVendor', () => {
    it('deve retornar produtos de um vendor específico', async () => {
      // Arrange
      const vendorId = 'vendor123';
      const products = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Pizza Margherita',
          price: 25.99,
          vendor: 'vendor123',
          type: 'food',
          isAvailable: true
        }
      ];

      const result = {
        products,
        total: 1,
        totalPages: 1,
        currentPage: 1
      };

      mockRequest = {
        params: { vendorId },
        query: { page: '1', limit: '10' }
      };

      // Mock do service
      jest.spyOn(ProductService, 'getProductsByVendor')
        .mockResolvedValue(result);

      // Act
      await productController.getProductsByVendor(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: products,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 10
        }
      });
    });
  });

  describe('searchProducts', () => {
    it('deve buscar produtos por termo de pesquisa', async () => {
      // Arrange
      const searchTerm = 'pizza';
      const products = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Pizza Margherita',
          price: 25.99,
          vendor: 'vendor123',
          type: 'food',
          isAvailable: true
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Pizza Pepperoni',
          price: 27.99,
          vendor: 'vendor123',
          type: 'food',
          isAvailable: true
        }
      ];

      const result = {
        products,
        total: 2,
        totalPages: 1,
        currentPage: 1
      };

      mockRequest = {
        query: {
          q: searchTerm,
          page: '1',
          limit: '10'
        }
      };

      // Mock do service
      jest.spyOn(ProductService, 'searchProducts')
        .mockResolvedValue(result);

      // Act
      await productController.searchProducts(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: products,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          itemsPerPage: 10
        }
      });
    });

    it('deve retornar erro quando termo de pesquisa está vazio', async () => {
      // Arrange
      mockRequest = {
        query: {
          q: '',
          page: '1',
          limit: '10'
        }
      };

      // Act
      await productController.searchProducts(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Termo de pesquisa é obrigatório'
      });
    });
  });

  describe('updateProductRating', () => {
    it('deve atualizar rating do produto com sucesso', async () => {
      // Arrange
      const productId = 'product123';
      const rating = 4.5;

      const updatedProduct = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Pizza Margherita',
        price: 25.99,
        vendor: 'vendor123',
        type: 'food',
        rating: 4.5,
        isAvailable: true
      };

      mockRequest = {
        params: { id: productId },
        body: { rating }
      };

      // Mock do service
      jest.spyOn(ProductService, 'updateProductRating')
        .mockResolvedValue(updatedProduct);

      // Act
      await productController.updateProductRating(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Rating do produto atualizado com sucesso',
        data: updatedProduct
      });
    });

    it('deve retornar erro quando rating é inválido', async () => {
      // Arrange
      const productId = 'product123';
      const rating = 6.0; // Rating maior que 5

      mockRequest = {
        params: { id: productId },
        body: { rating }
      };

      // Act
      await productController.updateProductRating(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Rating deve estar entre 0 e 5'
      });
    });
  });

  describe('toggleAvailability', () => {
    it('deve alternar disponibilidade do produto com sucesso', async () => {
      // Arrange
      const productId = 'product123';

      const updatedProduct = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Pizza Margherita',
        price: 25.99,
        vendor: 'vendor123',
        type: 'food',
        isAvailable: false, // Alternado para false
        rating: 4.5
      };

      mockRequest = {
        params: { id: productId }
      };

      // Mock do service
      jest.spyOn(ProductService, 'toggleAvailability')
        .mockResolvedValue(updatedProduct);

      // Act
      await productController.toggleAvailability(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Disponibilidade do produto alterada com sucesso',
        data: updatedProduct
      });
    });
  });
}); 