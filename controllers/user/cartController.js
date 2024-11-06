const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const HttpStatus = require('../../utils/httpStatusCodes')




const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).send({ message: "Product not found" });
        }
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(item => item.item.toString() === productId);
        const requestedQuantity = parseInt(quantity);

        if (existingItemIndex > -1) {
            const currentQuantity = cart.items[existingItemIndex].qty;
            const newQuantity = currentQuantity + requestedQuantity;

            if (newQuantity > 5) {
                cart.items[existingItemIndex].qty = 5;
                await cart.save();
                return res.status(HttpStatus.OK).send({
                    message: "Product quantity updated to maximum allowed (5)"
                });
            } else {
                cart.items[existingItemIndex].qty = newQuantity;
            }
        } else {
            if (requestedQuantity > 5) {
                cart.items.push({ item: productId, qty: 5, price: product.salePrice });
                await cart.save();
                return res.status(HttpStatus.OK).send({
                    message: "Product added to cart with maximum allowed quantity (5)"
                });
            } else {
                cart.items.push({ item: productId, qty: requestedQuantity, price: product.salePrice });
            }
        }

        await cart.save();
        console.log(cart);

        res.status(HttpStatus.OK).send({ message: "Product added to cart successfully" });
    } catch (error) {
        console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
    }
};

// //get cart
const getCart = async (req,res)=>{
    try {
        const userId = req.session.user
        if(!userId){
            res.redirect('/login')
        }
        const cart = await Cart.findOne({ user: userId }).populate({ path: 'items.item',
            select: 'productImage productName salePrice'});

        if(!cart || cart.items.length==0){
       return res.render('addtocart',{cart:null,subtotal:0.00})
        }
        
        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);


         res.render('addtocart',{
            cart,
            subtotal,
            user:req.user||null,
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
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.item._id.toString() === productId);
        
        if (item) {
            if (newQty > 0) {
                item.qty = newQty; 
            } else {    
            cart.items = cart.items.filter(item => item.item._id.toString() !== productId);
            }
        } else {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }
        const subtotal = cart.items.reduce((total, item) => total + item.qty * item.item.salePrice, 0);

        await cart.save();

        res.json({ success: true, newSubtotal: subtotal });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Failed to update cart' });
    }
};

const deleteFromCart = async (req,res)=>{
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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({message:"Server error"})
    }
}







module.exports ={
getCart,
addToCart,
updateCart,
deleteFromCart,
}