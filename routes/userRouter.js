const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const profileController = require('../controllers/user/profileController')
const cartController = require('../controllers/user/cartController')
const whishListController = require('../controllers/user/whishListController')
const Address = require('../models/addressSchema')
const Cart = require('../models/cartSchema')
const Product = require('../models/productSchema')
const Order = require('../models/orderSchema')
const passport = require("passport")
const { adminAuth, userAuth } = require('../middlewares/auth')
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });
const Razorpay = require('razorpay')
const crypto = require("crypto")

// router.post('/send-message', userController.sendMessage);
router.get('/', userController.loadHomepage)
router.get('/shop', userController.loadShop)
router.get('/pageNotFound', userController.pageNotFound)
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)
router.post("/verify-otp", userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup', failureMessage: true }), (req, res) => {
    req.session.user = req.user;


    res.redirect('/');
})
router.get('/login', userController.loadLogin)
router.post('/login', userController.login)
router.get('/product/:slug', userController.productDetails)
router.get('/forgot-password', profileController.getForgotPassPage)
router.post('/forgot-email', profileController.forgotEmail)
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp)
router.get('/reset-password', profileController.getResetPassPage)
router.post('/resend-forgot-otp', profileController.resendOtp)
router.post('/reset-password', profileController.newPassword)


router.get('/shopTrue', userController.shoptrue)

//userProfile
router.get('/userProfile', userAuth, profileController.userProfile)
//change password
router.get('/changePassword', userAuth, profileController.changePassword)
router.post('/changePassword', userAuth, profileController.changePasswordReady)
router.post('/verify-resetpass-otp', userAuth, profileController.verifyResetOtp)
//edit profile details
router.get('/editProfile', userAuth, profileController.getEditProfile)
router.post('/editProfile', userAuth, profileController.editProfile)
//address management
router.get('/addressManage', userAuth, profileController.getAddresses)
router.post('/addAddress', userAuth, profileController.addAddress)
router.post('/editAddress/:id', userAuth, profileController.editAddress)
router.get('/deleteAddress/:id', userAuth, profileController.deleteAddress)
//Change email
router.get('/changeEmail', userAuth, profileController.getChangeEmail)
router.post('/changeEmail', userAuth, profileController.changeEmail)
router.post('/verify-email-otp', userAuth, profileController.verifyEmailOtp)
router.post('/update-email', userAuth, profileController.updateEmail)
//Cart 
router.post('/addToCart', userAuth, cartController.addToCart)
router.get('/cart', cartController.getCart)
router.post('/updateCart/:productId', cartController.updateCart)
router.post('/removeCart/:productId', cartController.deleteFromCart)
// Checkout Page
router.get('/checkout', cartController.getCheckoutPage);
router.post('/checkout', cartController.orderConfirmationPage)
router.post('/placeOrder', cartController.placeOrder)
router.get('/invoice/:orderId', cartController.getInvoice)
router.post('/applyCoupon',cartController.applyCoupon)
router.post('/removeCoupon',cartController.removeCoupon)
//my-orders
router.get('/my-orders', profileController.myOrders)
router.get('/orders/:id',userAuth,profileController.getUserOrderDetails)
router.post('/orders/:orderId/cancel', profileController.cancelOrder)
router.post('/orders/:orderId/return',profileController.returnOrder)
router.get('/orders/:orderId/invoice/download',profileController.downloadInvoice)
//whishlist
router.get('/whishlist',userAuth,whishListController.getWhishListPage)
router.post('/addToWhishlist',userAuth,whishListController.addToWhishList)
router.post('/whishlist/remove',userAuth,whishListController.removeFromWhishlist)
//wallet
router.get('/getWallet',userAuth,profileController.getWallet)
router.post('/wallet/add-funds',userAuth,profileController.addWalletMoney)



const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Razorpay payment initiation route
router.post('/razorPay', async (req, res) => {
    const { amount } = req.body;

    const options = {
        amount: amount * 100, // Convert to smallest currency unit (paise for INR)
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json({
            key: process.env.RAZORPAY_KEY_ID, // Send public key
            amount: amount,
            currency: order.currency,
            id: order.id, // Razorpay order ID
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).send(error);
    }
});

// Razorpay payment verification route
router.post('/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, selectedAddress, paymentMethod } = req.body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    try {

        // Validate Razorpay signature
        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // Fetch user and cart details
        const user = req.session.user;
        const userId = user._id;

        // const address = await Address.findById(selectedAddress);
        const address = await Address.findById(selectedAddress)
        const cart = await Cart.findOne({ user: userId }).populate({ path: 'items.item', select: 'productName salePrice stock' });

        // const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);
        // const discount = Math.round(subtotal * 0.09);
        // const totalAmount = subtotal + tax;




        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);
        const discount = cart.coupon.discount
        const deliverycharge = 50
        const grandTotal = cart.grandTotal + deliverycharge
        const totalPrice = cart.totalPrice
        // Save the order
        const newOrder = new Order({
            user: userId,
            orderItems: cart.items.map(item => ({
                product: item.item._id,
                quantity: item.qty,
                price: item.item.salePrice,
            })),
            grandTotal,
            discount,
            finalAmount: grandTotal,
            totalPrice,
            address,
            paymentMethod,
            razorpay_order_id,
            razorpay_payment_id,
            status:'Confirmed',
            createdOn: Date.now(),
        });

        const savedOrder = await newOrder.save();

        // Update product stock and clear cart
        for (let item of cart.items) {
            const productId = item.item._id;
            const quantity = item.qty;
            const product = await Product.findById(productId);

            if (product) {
                product.stock -= quantity;
                await product.save();
            }
        }

        await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

        res.json({ success: true, message: 'Payment verified and order placed successfully', orderId: savedOrder._id });
    } catch (error) {
        console.error('Error during payment verification or order processing:', error);
        res.status(500).json({ status: 'failed', message: 'Error during payment verification or order processing' });
    }
});



router.get('/logout', userController.logout)
module.exports = router;



