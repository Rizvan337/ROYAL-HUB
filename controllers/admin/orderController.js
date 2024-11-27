const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Wallet = require('../../models/walletSchema')
const HttpStatus = require('../../utils/httpStatusCodes')
const moment = require('moment')
const getAllOrders = async (req, res) => {
    try {

        const orders = await Order.find()
            .populate('user')
            .sort({ createdOn: -1 });

        res.render('orders', { orders, moment });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const getOrderDetails = async (req, res) => {
    const { orderId } = req.params
    try {
        const order = await Order.findById(orderId).populate('user').populate('orderItems.product')
        if (!order) {
            res.status(HttpStatus.NOT_FOUND).send('Order not found')
        }
        return res.render('order-details', { order, moment })
    } catch (error) {
        console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
    }
}

const updateOrderStatus = async (req, res) => {
    const { id } = req.params
    const { status } = req.body
    try {
        const userId = req.session.user
        const order = await Order.findById(id)
        if (!order) {
            req.flash('error', "Order not found")
            return res.redirect('/admin/orderList')
        }
        if (status === "Cancelled" && order.status !== "Cancelled") {
            for (let item of order.orderItems) {    
                
                const productId = item.product
                const quantity = item.quantity
                await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } })
            }
        }
        order.status = status
        await order.save()
        if(order.paymentMethod==="Razorpay" && (order.status === "Cancelled" || order.status === "Returned")){
            const wallet = await Wallet.findOne({userId})
            if(wallet){
                wallet.balance += order.finalAmount
                wallet.transactions.push({
                    amount:order.finalAmount,
                    type:"credit",
                orderId:order._id,
                description:"Refund for cancel order"
                })
                await wallet.save()
            }
        }


        if (req.io) {
            req.io.emit('orderStatusChanged', {
                orderId: order._id,
                status: order.status
            })
        }
        req.flash('success', 'Order status updated successfully')
        return res.redirect('/admin/orderList')
    } catch (error) {
        console.error('Error updating status', error)
        req.flash('error', 'failed to update status')
        res.redirect('/admin/orderList')
    }
}


module.exports = {
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
    
}