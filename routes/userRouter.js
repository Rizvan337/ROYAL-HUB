const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const profileController = require('../controllers/user/profileController');
const cartController = require('../controllers/user/cartController');
const whishListController = require('../controllers/user/whishListController');
const Address = require('../models/addressSchema');
const Cart = require('../models/cartSchema');
const Product = require('../models/productSchema');
const Order = require('../models/orderSchema');
const Coupon = require('../models/couponSchema');
const Wallet = require('../models/walletSchema');
const validateAddress = require('../validators/addressValidator');
const passport = require('passport');
const { adminAuth, userAuth } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });
const Razorpay = require('razorpay');
const crypto = require('crypto');

// router.post('/send-message', userController.sendMessage);
router.get('/', userController.loadHomepage);
router.get('/shop', userController.loadShop);
router.get('/pageNotFound', userController.pageNotFound);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/signup',
    failureMessage: true,
  }),
  (req, res) => {
    req.session.user = req.user;

    res.redirect('/');
  }
);
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/product/:slug', userController.productDetails);
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-email', profileController.forgotEmail);
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.newPassword);

//userProfile
router.get('/userProfile', userAuth, profileController.userProfile);
//change password
router.get('/changePassword', userAuth, profileController.changePassword);
router.post('/changePassword', userAuth, profileController.changePasswordReady);
//edit profile details
router.get('/editProfile', userAuth, profileController.getEditProfile);
router.post('/editProfile', userAuth, profileController.editProfile);
//address management
router.get('/addressManage', userAuth, profileController.getAddresses);
router.post('/addAddress', userAuth, validateAddress, profileController.addAddress);
router.post('/editAddress/:id', userAuth, profileController.editAddress);
router.get('/deleteAddress/:id', userAuth, profileController.deleteAddress);
//Change email
router.get('/changeEmail', userAuth, profileController.getChangeEmail);
router.post('/changeEmail', userAuth, profileController.changeEmail);
router.post('/verify-email-otp', userAuth, profileController.verifyEmailOtp);
router.post('/update-email', userAuth, profileController.updateEmail);
//Cart
router.post('/addToCart', userAuth, cartController.addToCart);
router.get('/cart', userAuth, cartController.getCart);
router.post('/updateCart/:productId', userAuth, cartController.updateCart);
router.post('/removeCart/:productId', userAuth, cartController.deleteFromCart);
// Checkout Page
router.get('/checkout', userAuth, cartController.getCheckoutPage);
router.post('/checkout', userAuth, cartController.orderConfirmationPage);
router.post('/placeOrder', userAuth, cartController.placeOrder);
router.get('/invoice/:orderId', userAuth, cartController.getInvoice);
router.post('/applyCoupon', cartController.applyCoupon);
router.post('/removeCoupon', cartController.removeCoupon);
//my-orders
router.get('/my-orders', profileController.myOrders);
router.get('/orders/:id', userAuth, profileController.getUserOrderDetails);
router.post('/orders/:orderId/cancel', profileController.cancelOrder);
router.post('/orders/:orderId/return', profileController.returnOrder);
router.get(
  '/orders/:orderId/invoice/download',
  profileController.downloadInvoice
);
//whishlist
router.get('/whishlist', userAuth, whishListController.getWhishListPage);
router.post('/addToWhishlist', userAuth, whishListController.addToWhishList);
router.post(
  '/whishlist/remove',
  userAuth,
  whishListController.removeFromWhishlist
);
//wallet
router.get('/getWallet', userAuth, profileController.getWallet);
router.post('/wallet/add-funds', userAuth, profileController.addWalletMoney);









router.get('/api/wallet/balance', async (req, res) => {
  try {
      const userId = req.session.user; 
      const wallet = await Wallet.findOne({ userId });

      if (wallet) {
          res.status(200).json({ balance: wallet.balance });
      } else {
          res.status(404).json({ message: 'Wallet not found' });
      }
  } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});




router.get('/api/search-suggestions', async (req, res) => {
  try {
    const query = req.query.query || '';
    const suggestions = await Product.find(
      { productName: { $regex: query, $options: 'i' } },
      { productName: 1 }
    ).limit(5);
    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

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
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    selectedAddress,
    paymentMethod,
  } = req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  try {
    // Validate Razorpay signature
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      const user = req.session.user;
      const userId = user._id;

      const cart = await Cart.findOne({ user: userId }).populate({
        path: 'items.item',
        select: 'productName salePrice stock',
      });

      const address = await Address.findById(selectedAddress);

      const subtotal = cart.items.reduce(
        (total, item) => total + item.qty * item.item.salePrice,
        0
      );
      const discount = cart.coupon.discount;
      const deliverycharge = 50;
      const grandTotal = cart.grandTotal + deliverycharge;
      const totalPrice = cart.totalPrice;

      const failedOrder = new Order({
        user: userId,
        orderItems: cart.items.map((item) => ({
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
        razorpay_payment_id: null,
        status: 'Pending',
        createdOn: Date.now(),
      });

      await failedOrder.save();
      console.log('failed razorpay and save order', failedOrder);

      return res
        .status(400)
        .json({
          success: false,
          message: 'Invalid payment signature',
          orderId: failedOrder._id,
        });
    }

    // Fetch user and cart details
    const user = req.session.user;
    const userId = user._id;

    // const address = await Address.findById(selectedAddress);
    const address = await Address.findById(selectedAddress);
    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.item',
      select: 'productName salePrice stock',
    });

    
    const subtotal = cart.items.reduce(
      (total, item) => total + item.qty * item.item.salePrice,
      0
    );
    const discount = cart.coupon.discount;
    const deliverycharge = 50;
    const grandTotal = cart.grandTotal + deliverycharge;
    const totalPrice = cart.totalPrice;



 // Check if a coupon is applied and update its usage
 if (cart.coupon.code) {
  const coupon = await Coupon.findOne({ code: cart.coupon.code });

  if (coupon) {
    // Update coupon usage count
    if (coupon.userCount < coupon.usageLimit) {
      coupon.userCount += 1;
      coupon.usersUsed.push(userId);
      await coupon.save();
    } else {
      // Handle usage limit exceeded
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit exceeded',
      });
    }
  }
}


    // Save the order
    const newOrder = new Order({
      user: userId,
      orderItems: cart.items.map((item) => ({
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
      status: 'Confirmed',
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

    
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [], coupon: { code: null, discount: 0 } } } 
    );

    res.json({
      success: true,
      message: 'Payment verified and order placed successfully',
      orderId: savedOrder._id,
    });
  } catch (error) {
    console.error(
      'Error during payment verification or order processing:',
      error
    );
    res
      .status(500)
      .json({
        status: 'failed',
        message: 'Error during payment verification or order processing',
      });
  }
});

router.post('/handlePaymentFailure', async (req, res) => {
  const { razorpay_order_id, paymentError, selectedAddress, paymentMethod } =
    req.body;

  try {
    const user = req.session.user;
    const userId = user._id;

    const cart = await Cart.findOne({ user: userId }).populate('items.item');
    const address = await Address.findById(selectedAddress);

    const subtotal = cart.items.reduce(
      (total, item) => total + item.qty * item.item.salePrice,
      0
    );
    const discount = cart.coupon ? cart.coupon.discount : 0;
    const deliverycharge = 50;
    const grandTotal = subtotal + deliverycharge - discount;

    const pendingOrder = new Order({
      user: userId,
      orderItems: cart.items.map((item) => ({
        product: item.item._id,
        quantity: item.qty,
        price: item.item.salePrice,
      })),
      grandTotal,
      discount,
      finalAmount: grandTotal,
      address,
      paymentMethod,
      razorpay_order_id,
      status: 'Failed',
      paymentError,
      createdOn: Date.now(),
    });

    await pendingOrder.save();

    res
      .status(200)
      .json({
        success: true,
        message: 'Payment failed, order saved as pending.',
      });
  } catch (error) {
    console.error('Error handling payment failure:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error handling payment failure.' });
  }
});

//razorpay retrying payment
router.get('/retryOrder/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order || order.status !== 'Failed') {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Invalid order or order is not failed.',
        });
    }

    const options = {
      amount: order.grandTotal * 100,
      currency: 'INR',
      receipt: `retry_${order._id}`,
    };

    const newRazorpayOrder = await razorpay.orders.create(options);

    order.razorpay_order_id = newRazorpayOrder.id;
    await order.save();

    res.json({
      success: true,
      amount: newRazorpayOrder.amount,
      razorpay_order_id: newRazorpayOrder.id,
      selectedAddress: order.address,
    });
  } catch (error) {
    console.error('Error fetching order for retry:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error fetching order for retry' });
  }
});

router.get('/logout', userController.logout);
module.exports = router;
