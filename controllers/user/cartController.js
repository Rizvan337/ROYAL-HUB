const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const HttpStatus = require('../../utils/httpStatusCodes');
const moment = require('moment');





const addToCart = async (req, res) => {
    try {
        const userId = req.session.user
        const { productId, quantity } = req.body
        const product = await Product.findById(productId)
        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: "Product not found" })
        }
        let cart = await Cart.findOne({ user: userId })
        if (!cart) {
            cart = new Cart({ user: userId, items: [] })
        }
        console.log(cart)
        const existingItemIndex = cart.items.findIndex(item => item.item.toString() === productId)
        const requestedQuantity = parseInt(quantity)

        console.log(existingItemIndex, requestedQuantity)

        if (existingItemIndex > -1) {
            const currentQuantity = cart.items[existingItemIndex].qty;
            const newQuantity = currentQuantity + requestedQuantity;

            if (newQuantity > 5) {
                cart.items[existingItemIndex].qty = 5;
                await cart.save();
                return res.status(HttpStatus.OK).json({
                    message: "Product quantity updated to maximum allowed (5)"
                });

            }else if(newQuantity>product.stock){
                await cart.save()
                return res.status(HttpStatus.OK).json({
                    message: "Product quantity is greater than stock"
                });
            } 
            
            else {
                cart.items[existingItemIndex].qty = newQuantity;
            }
        } else {
            if (requestedQuantity > 5) {
                cart.items.push({ item: productId, qty: 5, price: product.salePrice });
                await cart.save();
                return res.status(HttpStatus.OK).json({
                    message: "Product added to cart with maximum allowed quantity (5)"
                });
            } else {
                cart.items.push({ item: productId, qty: requestedQuantity, price: product.salePrice });
            }
        }
 if (product.stock < requestedQuantity) {
      return res.status(400).send('Quantity exceeds available stock!');
    }
        await cart.save();
        console.log('item added to cart', cart);

        res.status(HttpStatus.OK).json({ message: "Product added to cart successfully" });
    } catch (error) {
        console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
    }
};

//get cart
const getCart = async (req, res) => {
    try {
        const user = req.session.user
        if (!user) {
            res.redirect('/login')
        }
        const cart = await Cart.findOne({ user }).populate({
            path: 'items.item',
            select: 'productImage productName salePrice'
        });

        if (!cart || cart.items.length == 0) {
            return res.render('addtocart', { cart: null, subtotal: 0.00, user })
        }

        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);


        res.render('addtocart', {
            cart,
            subtotal,
            user,
            products: cart.items.map(i => i.item)
            
        })
    } catch (error) {
        console.error(error)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("server error")
    }
}



const updateCart = async (req, res) => {
    const productId = req.params.productId;
    const newQty = parseInt(req.body.qty);
    const userId = req.session.user;

    try {

        const cart = await Cart.findOne({ user: userId }).populate('items.item', 'salePrice');

        if (!cart) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.item._id.toString() === productId);
        if (item) {
            if (newQty > 0) {
                item.qty = newQty;
            } else {
                cart.items = cart.items.filter(item => item.item._id.toString() !== productId);
            }
        } else {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Item not found in cart' });
        }
        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);

        await cart.save();

        res.json({ success: true, newSubtotal: subtotal });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to update cart' });
    }
};

const deleteFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        Cart.updateOne(
            { user: req.session.user },
            { $pull: { items: { 'item': productId } } }
        )
            .then(result => {
                res.json({ success: true, message: 'Item removed from cart' });
            })
            .catch(err => {
                console.error(err);
                res.status(500).json({ success: false, message: 'Failed to remove item' });
            });

    } catch (error) {
        console.error(error)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: "Server error" })
    }
}


const getCheckoutPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userId = user._id
        if (!userId) {
            return res.redirect('/login');
        }
        const addresses = await Address.find({ userId });
        console.log(user, userId);

        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.item',
            select: 'productName salePrice'
        });
        console.log("cart:", cart.items);

        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);
        const tax = Math.round(subtotal * 0.09)
        const totalAmount = subtotal + tax;
        console.log(totalAmount, subtotal);

        res.render('checkout', {
            addresses,
            cartItems: cart.items,
            subtotal,
            tax,
            totalAmount,

        });

    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
    }
};


const orderConfirmationPage = async (req, res) => {
    try {
        const { selectedAddress, paymentMethod } = req.body
        const user = req.session.user
        const userId = user._id
        const address = await Address.findById(selectedAddress)
        console.log("Address:", address);

        const cart = await Cart.findOne({ user: userId }).populate({ path: 'items.item', select: 'productName salePrice' })
        console.log("Cart items:", cart.items)
        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0)
        const tax = Math.round(subtotal * 0.09)
        const totalAmount = subtotal + tax
        res.render('order-confirmation', {
            address,
            cartItems: cart.items,
            subtotal,
            tax,
            totalAmount,
            paymentMethod
        })
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
        const cart = await Cart.findOne({ user: userId }).populate({ path: 'items.item', select: 'productName salePrice stock' });

        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);
        const tax = Math.round(subtotal * 0.09);
        const totalAmount = subtotal + tax;
        
        const newOrder = new Order({
            user: userId,
            orderItems: cart.items.map(item => ({
                product: item.item._id,
                quantity: item.qty,
                price: item.item.salePrice
            })),
            totalPrice: subtotal,
            tax,
            finalAmount: totalAmount,
            address,
            paymentMethod,
            status: 'Pending',
            createdOn: Date.now()
        });
        const savedOrder = await newOrder.save()
        console.log(savedOrder)


        for (let item of cart.items) {
            const productId = item.item._id
            const quantity = item.qty
            const product = await Product.findById(productId)
            if (product) {
                product.stock -= quantity
                await product.save()
            }
        }

        await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
        res.redirect(`/invoice/${savedOrder._id}`);
    } catch (error) {
        console.error('Error in placeOrder:', error);
        res.status(500).send('Server Error');
    }
};

const getInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('address').populate('orderItems.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('order-invoice', {
            order,
            moment: require('moment')
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
    }
}

module.exports = {
    getCart,
    addToCart,
    updateCart,
    deleteFromCart,
    getCheckoutPage,
    orderConfirmationPage,
    placeOrder,
    getInvoice,
}