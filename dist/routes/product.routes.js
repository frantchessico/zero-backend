"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/productRoutes.ts
const express_1 = require("express");
const product_controller_1 = __importDefault(require("../core/product/product.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/', product_controller_1.default.getProducts);
router.get('/vendor/:vendorId', product_controller_1.default.getProductsByVendor);
router.get('/category/:categoryId', product_controller_1.default.getProductsByCategory);
router.get('/popular', product_controller_1.default.getPopularProducts);
router.get('/search', product_controller_1.default.searchProducts);
router.get('/:id', product_controller_1.default.getProductById);
// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação
// ===== ROTAS DO VENDOR AUTENTICADO =====
router.post('/my-products', auth_guard_1.AuthGuard, product_controller_1.default.createMyProduct); // ✅ Novo endpoint para vendor autenticado
router.get('/my-products', auth_guard_1.AuthGuard, product_controller_1.default.getMyProducts); // ✅ Novo endpoint para listar produtos do vendor
router.put('/my-products/:id', auth_guard_1.AuthGuard, product_controller_1.default.updateMyProduct); // ✅ Novo endpoint para atualizar produto
// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.put('/:id', auth_guard_1.AuthGuard, product_controller_1.default.updateProduct);
router.delete('/:id', auth_guard_1.AuthGuard, product_controller_1.default.deleteProduct);
router.patch('/:id/rating', auth_guard_1.AuthGuard, product_controller_1.default.updateProductRating);
router.patch('/:id/availability', auth_guard_1.AuthGuard, product_controller_1.default.toggleAvailability);
router.patch('/:id/popular', auth_guard_1.AuthGuard, product_controller_1.default.togglePopular);
exports.default = router;
// Para usar em app.ts ou server.ts:
// import productRoutes from './routes/productRoutes';
// app.use('/api/products', productRoutes);
