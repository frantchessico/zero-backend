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
const Product_1 = __importDefault(require("../../models/Product"));
const mongoose_1 = require("mongoose");
class ProductService {
    createProduct(productData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const product = new Product_1.default(Object.assign(Object.assign({}, productData), { vendor: new mongoose_1.Types.ObjectId(productData.vendor), categoryId: productData.categoryId ? new mongoose_1.Types.ObjectId(productData.categoryId) : undefined }));
                return yield product.save();
            }
            catch (error) {
                throw new Error(`Erro ao criar produto: ${error.message}`);
            }
        });
    }
    getProductById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(id)) {
                    throw new Error('ID inválido');
                }
                return yield Product_1.default.findById(id)
                    .populate('vendor', 'name email businessName')
                    .populate('categoryId', 'name description')
                    .exec();
            }
            catch (error) {
                throw new Error(`Erro ao buscar produto: ${error.message}`);
            }
        });
    }
    getProducts() {
        return __awaiter(this, arguments, void 0, function* (filters = {}, options = {}) {
            try {
                const { vendor, categoryId, type, isAvailable, isPopular, isVegetarian, isVegan, isGlutenFree, isSpicy, minPrice, maxPrice, search, tags, allergens } = filters;
                const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
                // Construir query de filtros
                const query = {};
                if (vendor)
                    query.vendor = new mongoose_1.Types.ObjectId(vendor);
                if (categoryId)
                    query.categoryId = new mongoose_1.Types.ObjectId(categoryId);
                if (type)
                    query.type = type;
                if (typeof isAvailable === 'boolean')
                    query.isAvailable = isAvailable;
                if (typeof isPopular === 'boolean')
                    query.isPopular = isPopular;
                if (typeof isVegetarian === 'boolean')
                    query.isVegetarian = isVegetarian;
                if (typeof isVegan === 'boolean')
                    query.isVegan = isVegan;
                if (typeof isGlutenFree === 'boolean')
                    query.isGlutenFree = isGlutenFree;
                if (typeof isSpicy === 'boolean')
                    query.isSpicy = isSpicy;
                // Filtro de preço
                if (minPrice !== undefined || maxPrice !== undefined) {
                    query.price = {};
                    if (minPrice !== undefined)
                        query.price.$gte = minPrice;
                    if (maxPrice !== undefined)
                        query.price.$lte = maxPrice;
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
                const sortOptions = {};
                sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
                // Executar query com paginação
                const skip = (page - 1) * limit;
                const [products, total] = yield Promise.all([
                    Product_1.default.find(query)
                        .populate('vendor', 'name email businessName')
                        .populate('categoryId', 'name description')
                        .sort(sortOptions)
                        .skip(skip)
                        .limit(limit)
                        .exec(),
                    Product_1.default.countDocuments(query)
                ]);
                const totalPages = Math.ceil(total / limit);
                return { products, total, totalPages };
            }
            catch (error) {
                throw new Error(`Erro ao buscar produtos: ${error.message}`);
            }
        });
    }
    updateProduct(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(id)) {
                    throw new Error('ID inválido');
                }
                const updatePayload = Object.assign({}, updateData);
                if (updateData.vendor) {
                    updatePayload.vendor = new mongoose_1.Types.ObjectId(updateData.vendor);
                }
                if (updateData.categoryId) {
                    updatePayload.categoryId = new mongoose_1.Types.ObjectId(updateData.categoryId);
                }
                return yield Product_1.default.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true })
                    .populate('vendor', 'name email businessName')
                    .populate('categoryId', 'name description')
                    .exec();
            }
            catch (error) {
                throw new Error(`Erro ao atualizar produto: ${error.message}`);
            }
        });
    }
    deleteProduct(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(id)) {
                    throw new Error('ID inválido');
                }
                const result = yield Product_1.default.findByIdAndDelete(id);
                return !!result;
            }
            catch (error) {
                throw new Error(`Erro ao deletar produto: ${error.message}`);
            }
        });
    }
    getProductsByVendor(vendorId_1) {
        return __awaiter(this, arguments, void 0, function* (vendorId, options = {}) {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(vendorId)) {
                    throw new Error('ID do vendor inválido');
                }
                const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
                const skip = (page - 1) * limit;
                const sortOptions = {};
                sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
                const [products, total] = yield Promise.all([
                    Product_1.default.find({ vendor: new mongoose_1.Types.ObjectId(vendorId) })
                        .populate('categoryId', 'name description')
                        .sort(sortOptions)
                        .skip(skip)
                        .limit(limit)
                        .exec(),
                    Product_1.default.countDocuments({ vendor: new mongoose_1.Types.ObjectId(vendorId) })
                ]);
                return { products, total };
            }
            catch (error) {
                throw new Error(`Erro ao buscar produtos do vendor: ${error.message}`);
            }
        });
    }
    getProductsByCategory(categoryId_1) {
        return __awaiter(this, arguments, void 0, function* (categoryId, options = {}) {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(categoryId)) {
                    throw new Error('ID da categoria inválido');
                }
                const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
                const skip = (page - 1) * limit;
                const sortOptions = {};
                sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
                const [products, total] = yield Promise.all([
                    Product_1.default.find({ categoryId: new mongoose_1.Types.ObjectId(categoryId), isAvailable: true })
                        .populate('vendor', 'name email businessName')
                        .sort(sortOptions)
                        .skip(skip)
                        .limit(limit)
                        .exec(),
                    Product_1.default.countDocuments({ categoryId: new mongoose_1.Types.ObjectId(categoryId), isAvailable: true })
                ]);
                return { products, total };
            }
            catch (error) {
                throw new Error(`Erro ao buscar produtos da categoria: ${error.message}`);
            }
        });
    }
    getPopularProducts() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            try {
                return yield Product_1.default.find({ isPopular: true, isAvailable: true })
                    .populate('vendor', 'name email businessName')
                    .populate('categoryId', 'name description')
                    .sort({ rating: -1, reviewCount: -1 })
                    .limit(limit)
                    .exec();
            }
            catch (error) {
                throw new Error(`Erro ao buscar produtos populares: ${error.message}`);
            }
        });
    }
    updateProductRating(id_1, rating_1) {
        return __awaiter(this, arguments, void 0, function* (id, rating, increment = true) {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(id)) {
                    throw new Error('ID inválido');
                }
                if (rating < 0 || rating > 5) {
                    throw new Error('Rating deve estar entre 0 e 5');
                }
                const product = yield Product_1.default.findById(id);
                if (!product) {
                    throw new Error('Produto não encontrado');
                }
                let newRating;
                let newReviewCount;
                if (increment) {
                    // Adicionar nova avaliação
                    const totalRating = (product.rating || 0) * (product.reviewCount || 0);
                    newReviewCount = (product.reviewCount || 0) + 1;
                    newRating = (totalRating + rating) / newReviewCount;
                }
                else {
                    // Definir rating diretamente (para casos especiais)
                    newRating = rating;
                    newReviewCount = product.reviewCount || 0;
                }
                return yield Product_1.default.findByIdAndUpdate(id, {
                    rating: Math.round(newRating * 10) / 10, // Arredondar para 1 casa decimal
                    reviewCount: newReviewCount
                }, { new: true }).exec();
            }
            catch (error) {
                throw new Error(`Erro ao atualizar rating do produto: ${error.message}`);
            }
        });
    }
    searchProducts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, filters = {}) {
            try {
                const query = Object.assign({ $text: { $search: searchTerm }, isAvailable: true }, filters);
                return yield Product_1.default.find(query)
                    .populate('vendor', 'name email businessName')
                    .populate('categoryId', 'name description')
                    .sort({ score: { $meta: 'textScore' }, rating: -1 })
                    .limit(20)
                    .exec();
            }
            catch (error) {
                throw new Error(`Erro ao buscar produtos: ${error.message}`);
            }
        });
    }
}
exports.default = new ProductService();
