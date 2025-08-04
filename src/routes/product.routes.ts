// routes/productRoutes.ts
import { Router } from 'express';
import ProductController from '../core/product/product.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);
router.get('/vendor/:vendorId', ProductController.getProductsByVendor);
router.get('/category/:categoryId', ProductController.getProductsByCategory);
router.get('/popular', ProductController.getPopularProducts);
router.get('/search', ProductController.searchProducts);

// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação

// ===== ROTAS DO VENDOR AUTENTICADO =====
router.post('/my-products', AuthGuard, ProductController.createMyProduct); // ✅ Novo endpoint para vendor autenticado
router.get('/my-products', AuthGuard, ProductController.getMyProducts); // ✅ Novo endpoint para listar produtos do vendor
router.put('/my-products/:id', AuthGuard, ProductController.updateMyProduct); // ✅ Novo endpoint para atualizar produto

// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.put('/:id', AuthGuard, ProductController.updateProduct);
router.delete('/:id', AuthGuard, ProductController.deleteProduct);
router.patch('/:id/rating', AuthGuard, ProductController.updateProductRating);
router.patch('/:id/availability', AuthGuard, ProductController.toggleAvailability);
router.patch('/:id/popular', AuthGuard, ProductController.togglePopular);

export default router;

// Para usar em app.ts ou server.ts:
// import productRoutes from './routes/productRoutes';
// app.use('/api/products', productRoutes);