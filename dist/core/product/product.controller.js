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
const product_service_1 = __importDefault(require("./product.service"));
const User_1 = require("../../models/User");
const Vendor_1 = require("../../models/Vendor");
const logger_1 = require("../../utils/logger");
class ProductController {
    /**
     * POST /products/my-products - Criar produto para vendor autenticado
     */
    createMyProduct(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
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
                const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
                if (!vendor) {
                    res.status(404).json({
                        success: false,
                        message: 'Vendor não encontrado para este usuário'
                    });
                    return;
                }
                const productData = Object.assign(Object.assign({}, req.body), { vendor: vendor._id.toString() // Usar vendor do usuário autenticado
                 });
                // Validações básicas
                if (!productData.name || !productData.price || !productData.type) {
                    res.status(400).json({
                        success: false,
                        message: 'Campos obrigatórios: name, price, type'
                    });
                    return;
                }
                const product = yield product_service_1.default.createProduct(productData);
                res.status(201).json({
                    success: true,
                    message: 'Produto criado com sucesso',
                    data: product
                });
            }
            catch (error) {
                logger_1.logger.error('Error creating my product:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar produto'
                });
            }
        });
    }
    /**
     * GET /products/my-products - Listar produtos do vendor autenticado
     */
    getMyProducts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
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
                const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
                if (!vendor) {
                    res.status(404).json({
                        success: false,
                        message: 'Vendor não encontrado para este usuário'
                    });
                    return;
                }
                const filters = {
                    vendor: vendor._id.toString(),
                    isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
                    type: req.query.type,
                    search: req.query.search
                };
                const options = {
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 10,
                    sortBy: req.query.sortBy || 'createdAt',
                    sortOrder: req.query.sortOrder || 'desc',
                };
                const result = yield product_service_1.default.getProducts(filters, options);
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
            }
            catch (error) {
                logger_1.logger.error('Error fetching my products:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar produtos'
                });
            }
        });
    }
    /**
     * PUT /products/my-products/:id - Atualizar produto do vendor autenticado
     */
    updateMyProduct(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
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
                const updateData = req.body;
                // Verificar se o produto pertence ao vendor
                const product = yield product_service_1.default.getProductById(id);
                if (!product) {
                    res.status(404).json({
                        success: false,
                        message: 'Produto não encontrado'
                    });
                    return;
                }
                // Buscar vendor do usuário
                const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
                if (!vendor || product.vendor.toString() !== vendor._id.toString()) {
                    res.status(403).json({
                        success: false,
                        message: 'Você não tem permissão para atualizar este produto'
                    });
                    return;
                }
                const updatedProduct = yield product_service_1.default.updateProduct(id, updateData);
                res.status(200).json({
                    success: true,
                    message: 'Produto atualizado com sucesso',
                    data: updatedProduct
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating my product:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar produto'
                });
            }
        });
    }
    // Buscar produto por ID
    getProductById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const product = yield product_service_1.default.getProductById(id);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Listar produtos com filtros e paginação
    getProducts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const filters = {
                    vendor: req.query.vendor,
                    categoryId: req.query.categoryId,
                    type: req.query.type,
                    isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
                    isPopular: req.query.isPopular ? req.query.isPopular === 'true' : undefined,
                    isVegetarian: req.query.isVegetarian ? req.query.isVegetarian === 'true' : undefined,
                    isVegan: req.query.isVegan ? req.query.isVegan === 'true' : undefined,
                    isGlutenFree: req.query.isGlutenFree ? req.query.isGlutenFree === 'true' : undefined,
                    isSpicy: req.query.isSpicy ? req.query.isSpicy === 'true' : undefined,
                    minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
                    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
                    search: req.query.search,
                    tags: req.query.tags ? req.query.tags.split(',') : undefined,
                    allergens: req.query.allergens ? req.query.allergens.split(',') : undefined,
                };
                const options = {
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 10,
                    sortBy: req.query.sortBy || 'createdAt',
                    sortOrder: req.query.sortOrder || 'desc',
                };
                const result = yield product_service_1.default.getProducts(filters, options);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Atualizar produto
    updateProduct(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const product = yield product_service_1.default.updateProduct(id, updateData);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Deletar produto
    deleteProduct(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const deleted = yield product_service_1.default.deleteProduct(id);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Buscar produtos por vendor
    getProductsByVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { vendorId } = req.params;
                const options = {
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 10,
                    sortBy: req.query.sortBy || 'createdAt',
                    sortOrder: req.query.sortOrder || 'desc',
                };
                const result = yield product_service_1.default.getProductsByVendor(vendorId, options);
                res.status(200).json({
                    success: true,
                    data: result.products,
                    pagination: {
                        currentPage: options.page,
                        totalItems: result.total,
                        itemsPerPage: options.limit
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Buscar produtos por categoria
    getProductsByCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { categoryId } = req.params;
                const options = {
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 10,
                    sortBy: req.query.sortBy || 'createdAt',
                    sortOrder: req.query.sortOrder || 'desc',
                };
                const result = yield product_service_1.default.getProductsByCategory(categoryId, options);
                res.status(200).json({
                    success: true,
                    data: result.products,
                    pagination: {
                        currentPage: options.page,
                        totalItems: result.total,
                        itemsPerPage: options.limit
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Buscar produtos populares
    getPopularProducts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const products = yield product_service_1.default.getPopularProducts(limit);
                res.status(200).json({
                    success: true,
                    data: products
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Buscar produtos por texto
    searchProducts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { q } = req.query;
                if (!q || typeof q !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Parâmetro de busca (q) é obrigatório'
                    });
                    return;
                }
                const filters = {
                    type: req.query.type,
                    vendor: req.query.vendor,
                    categoryId: req.query.categoryId,
                };
                const products = yield product_service_1.default.searchProducts(q, filters);
                res.status(200).json({
                    success: true,
                    data: products
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Atualizar rating do produto
    updateProductRating(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const product = yield product_service_1.default.updateProductRating(id, rating);
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
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Alternar disponibilidade do produto
    toggleAvailability(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const product = yield product_service_1.default.getProductById(id);
                if (!product) {
                    res.status(404).json({
                        success: false,
                        message: 'Produto não encontrado'
                    });
                    return;
                }
                const updatedProduct = yield product_service_1.default.updateProduct(id, {
                    isAvailable: !product.isAvailable
                });
                res.status(200).json({
                    success: true,
                    message: `Produto ${(updatedProduct === null || updatedProduct === void 0 ? void 0 : updatedProduct.isAvailable) ? 'disponibilizado' : 'indisponibilizado'} com sucesso`,
                    data: updatedProduct
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // Alternar popularidade do produto
    togglePopular(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const product = yield product_service_1.default.getProductById(id);
                if (!product) {
                    res.status(404).json({
                        success: false,
                        message: 'Produto não encontrado'
                    });
                    return;
                }
                const updatedProduct = yield product_service_1.default.updateProduct(id, {
                    isPopular: !product.isPopular
                });
                res.status(200).json({
                    success: true,
                    message: `Produto ${(updatedProduct === null || updatedProduct === void 0 ? void 0 : updatedProduct.isPopular) ? 'marcado como popular' : 'desmarcado como popular'}`,
                    data: updatedProduct
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
}
exports.default = new ProductController();
