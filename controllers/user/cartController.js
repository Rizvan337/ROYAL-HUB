const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
const HttpStatus = require('../../utils/httpStatusCodes');
const moment = require('moment');

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ message: 'Product not found' });
    }

    const requestedQuantity = parseInt(quantity);
    if (product.stock < requestedQuantity) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Product quantity is greater than stock',
      });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.item.toString() === productId
    );
    // const requestedQuantity = parseInt(quantity)

    if (existingItemIndex > -1) {
      const currentQuantity = cart.items[existingItemIndex].qty;
      const newQuantity = currentQuantity + requestedQuantity;

      if (newQuantity > 5) {
        cart.items[existingItemIndex].qty = 5;
        await cart.save();
        return res.status(HttpStatus.OK).json({
          message: 'Product quantity updated to maximum allowed (5)',
        });
      } else if (newQuantity > product.stock) {
        await cart.save();
        return res.status(HttpStatus.OK).json({
          message: 'Product quantity is greater than stock',
        });
      } else {
        cart.items[existingItemIndex].qty = newQuantity;
      }
    } else {
      if (requestedQuantity > 5) {
        cart.items.push({ item: productId, qty: 5, price: product.salePrice });
        await cart.save();
        return res.status(HttpStatus.OK).json({
          message: 'Product added to cart with maximum allowed quantity (5)',
        });
      } else {
        cart.items.push({
          item: productId,
          qty: requestedQuantity,
          price: product.salePrice,
        });
      }
    }
    if (product.stock < requestedQuantity) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'less stock',
      });
    }
    await cart.save();

    return res
      .status(HttpStatus.OK)
      .json({ message: 'Product added to cart successfully' });
  } catch (error) {
    console.error(error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'server error',
    });
  }
};

//get cart
const getCart = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      res.redirect('/login');
    }
    const cart = await Cart.findOne({ user }).populate({
      path: 'items.item',
      select: 'productImage productName salePrice',
    });

    if (!cart || cart.items.length == 0) {
      return res.render('addtocart', { cart: null, subtotal: 0.0, user });
    }

    const subtotal = cart.items.reduce(
      (total, item) => total + item.qty * item.item.salePrice,
      0
    );

    res.render('addtocart', {
      cart,
      subtotal,
      user,
      products: cart.items.map((i) => i.item),
    });
  } catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('server error');
  }
};

const updateCart = async (req, res) => {
  const productId = req.params.productId;
  const newQty = parseInt(req.body.qty);
  const userId = req.session.user;

  try {
    const cart = await Cart.findOne({ user: userId }).populate(
      'items.item',
      'salePrice stock'
    );

    if (!cart) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.find(
      (item) => item.item._id.toString() === productId
    );
    if (!item) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Item not found in cart' });
    }

    if (newQty > item.item.stock) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: `Stock unavailable. Only ${item.item.stock} items left in stock.`,
      });
    }

    if (newQty > 0) {
      item.qty = newQty;
    } else {
      cart.items = cart.items.filter(
        (item) => item.item._id.toString() !== productId
      );
    }

    const subtotal = cart.items.reduce(
      (total, item) => total + item.qty * item.item.salePrice,
      0
    );

    await cart.save();

    res.json({ success: true, newSubtotal: subtotal });
  } catch (error) {
    console.error('Error updating cart:', error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Failed to update cart' });
  }
};


const deleteFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    const updateResult = await Cart.updateOne(
      { user: req.session.user },
      { $pull: { items: { item: productId } } }
    );

    if (updateResult.modifiedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found in cart' });
    }

    const cart = await Cart.findOne({ user: req.session.user });
    if (cart) {
      cart.grandTotal -= product.salePrice;
      if (cart.grandTotal < 0) cart.grandTotal = 0;
      await cart.save();
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCheckoutPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user._id;
    if (!userId) {
      return res.redirect('/login');
    }
    const addresses = await Address.find({ userId });

    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.item',
      select: 'productName salePrice',
    });
    const deliverycharge = 50;

    const discount = cart.coupon.discount;
    const subtotal = cart.items.reduce(
      (total, item) => total + item.qty * item.item.salePrice,
      0
    );
    const grandTotal = cart.grandTotal + deliverycharge;

    // const totalAmount = subtotal + tax;
    // console.log(totalAmount, subtotal);

    const coupon = await Coupon.find({});
    res.render('checkout', {
      addresses,
      cartItems: cart.items,
      subtotal,
      deliverycharge,
      // totalAmount,
      coupon,
      discount,
      grandTotal,
      cart,
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};

const orderConfirmationPage = async (req, res) => {
  try {
    const { selectedAddress, paymentMethod } = req.body;
    const user = req.session.user;
    const userId = user._id;
    const address = await Address.findById(selectedAddress);

    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.item',
      select: 'productName salePrice',
    });

    const subtotal = cart.items.reduce(
      (total, item) => total + item.qty * item.item.salePrice,
      0
    );
    const deliverycharge = 50;
    const discount = cart.coupon.discount;
    const grandTotal = cart.grandTotal + deliverycharge;

    if (paymentMethod === 'Wallet') {
      const wallet = await Wallet.findOne({ userId });
      if (wallet.balance >= grandTotal) {
        wallet.balance -= grandTotal;
        wallet.transactions.push({
          amount: grandTotal,
          type: 'debit',
          description: 'Order payment',
          orderId: Order._id,
        });
        await wallet.save();
      } else {
        res
          .status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: 'Insufficient wallet balance' });
      }
    }

    if (paymentMethod === 'COD' && grandTotal > 1000) {
      return res.status(HttpStatus.OK).json({
        success: false,
        message:
          'Orders above ₹1000 cannot use Cash on Delivery. Please select a different payment method.',
      });
    }

    res.render('order-confirmation', {
      address,
      cartItems: cart.items,
      subtotal,
      deliverycharge,
      discount,
      grandTotal,
      paymentMethod,
    });
  } catch (error) {
    console.error('Error in orderConfirmationPage:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};

const placeOrder = async (req, res) => {
  try {
    const { selectedAddress, paymentMethod } = req.body;
    const user = req.session.user;
    const userId = user._id;

    const address = await Address.findById(selectedAddress);
    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.item',
      select: 'productName salePrice stock',
    });

    const subtotal = cart.items.reduce(
      (total, item) => total + item.qty * item.item.salePrice,
      0
    );
    const discount = cart.coupon.discount || 0;
    const deliverycharge = 50;
    const grandTotal = cart.grandTotal + deliverycharge;
    const totalPrice = cart.totalPrice;
    const newOrder = new Order({
      user: userId,
      orderItems: cart.items.map((item) => ({
        product: item.item._id,
        quantity: item.qty,
        price: item.item.salePrice,
      })),
      grandTotal,
      discount,
      deliverycharge,
      finalAmount: grandTotal,
      totalPrice,
      address,
      paymentMethod,
      status: 'Pending',
      createdOn: Date.now(),
    });
    const savedOrder = await newOrder.save();
    // console.log(savedOrder)

    for (let item of cart.items) {
      const productId = item.item._id;
      const quantity = item.qty;
      const product = await Product.findById(productId);
      if (product) {
        product.stock -= quantity;
        await product.save();
      }
    }

    await Cart.deleteOne({ user: userId });

    res.json({
      success: true,
      message: 'Order placed successfully',
      orderId: savedOrder._id,
    });
    // res.redirect(`/${savedOrder._id}`);
  } catch (error) {
    console.error('Error in placeOrder:', error);
    res.status(500).send('Server Error');
  }
};

const getInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate('address')
      .populate('orderItems.product');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.render('order-invoice', {
      order,
      moment: require('moment'),
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const user = req.session.user;
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found.',
      });
    }

    const userId = user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty.',
      });
    }

    if (cart.coupon.code) {
      return res.status(400).json({
        success: false,
        message: 'A coupon is already applied to this cart.',
      });
    }
    //finding coupon
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon code.',
      });
    }

    // Check if the coupon is active and not expired
    const currentDate = new Date();
    if (!coupon.isActive || currentDate > coupon.expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is either inactive or has expired.',
      });
    }

    const cartTotal = cart.totalPrice;

    if (cartTotal < coupon.maxDiscount) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount of ₹${coupon.maxDiscount} is required to apply this coupon.`,
      });
    }

    // Checking limit of coupon
    if (coupon.usageLimit !== null && coupon.userCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its usage limit.',
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountAmount;
    }
    coupon.userCount += 1;
    coupon.usersUsed.push(userId);

    cart.coupon.code = couponCode;
    cart.coupon.discount = discountAmount;
    cart.grandTotal = cart.grandTotal - discountAmount;
    await cart.save();
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon applied successfully. You saved ₹${discountAmount}.`,
      discountAmount,
      grandTotal: cart.grandTotal,
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while applying the coupon.',
    });
  }
};
const removeCoupon = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const userId = user._id;
    const cart = await Cart.findOne({ user: userId });

    if (!cart || !cart.coupon.code) {
      return res.status(400).json({
        success: false,
        message: 'No coupon applied to this cart.',
      });
    }

    console.log('Cart:', cart); 
    console.log('Coupon Code:', cart?.coupon?.code); 

    const coupon = await Coupon.findOne({ code: cart.coupon.code });
    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon code.',
      });
    }

    console.log('Coupon Found:', coupon); 

    // Update coupon usage
    const userIndex = coupon.usersUsed.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (userIndex !== -1) {
      // Decrement user count and remove the user from the `usersUsed` array
      coupon.userCount = Math.max(0, coupon.userCount - 1);
      coupon.usersUsed.splice(userIndex, 1);
      await coupon.save();
    }

    cart.coupon.code = null;
    cart.coupon.discount = 0;
    cart.grandTotal = cart.totalPrice; 
    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon removed successfully.',
    });
  } catch (error) {
    console.error('Error removing coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while removing the coupon.',
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCart,
  deleteFromCart,
  getCheckoutPage,
  orderConfirmationPage,
  placeOrder,
  getInvoice,
  applyCoupon,
  removeCoupon,
};
