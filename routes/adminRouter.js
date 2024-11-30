const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const orderController = require('../controllers/admin/orderController')
const couponController = require('../controllers/admin/couponController')
const { adminAuth } = require('../middlewares/auth')
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({ storage: storage })



router.get('/pageerror', adminController.pageerror)

//Login management
router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)
router.get('/', adminAuth, adminController.loadDashboard)
router.get('/logout', adminController.logout)

//User Management
router.get('/users', adminAuth, customerController.customerInfo)
router.get('/blockCustomer', adminAuth, customerController.customerBlocked)
router.get('/unblockCustomer', adminAuth, customerController.customerunBlocked)

//Category management
router.get('/category', adminAuth, categoryController.categoryInfo)
router.post('/addCategory', adminAuth, categoryController.addCategory)
router.get('/listCategory', adminAuth, categoryController.getListCategory)
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCategory)
router.get('/editCategory', adminAuth, categoryController.getEditCategory)
router.post('/editCategory/:id', adminAuth, categoryController.editCategory)


//Product management
router.get('/addProducts', adminAuth, productController.getProductAddPage)
router.post('/addProducts', adminAuth, uploads.array('images', 4), productController.addProducts)
router.get('/products', adminAuth, productController.getAllProducts)
router.get('/blockProduct', adminAuth, productController.blockProduct)
router.get('/unblockProduct', adminAuth, productController.unblockProduct)
router.get('/editProduct', adminAuth, productController.getEditProduct);
router.post('/editProduct/:id', adminAuth, uploads.array("images", 4), productController.editProduct)
router.post('/deleteImage', adminAuth, productController.deleteSingleImage)

//orderManagement
router.get('/orderList', adminAuth, orderController.getAllOrders)
router.get('/orders/:orderId', adminAuth, orderController.getOrderDetails)
router.post('/orders/:id/update-status', orderController.updateOrderStatus);

//coupon management
router.get('/coupons',adminAuth,couponController.getCouponPage)
router.post('/coupons/add',adminAuth,couponController.addCoupon)
router.post('/coupons/delete/:id',adminAuth,couponController.removeCoupon)
// router.post('/coupons/update/:id',adminAuth,couponController.updateCouponStatus)
// router.post('/coupons/edit/:id',adminAuth,couponController.editCoupons)
module.exports = router 