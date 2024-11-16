    const Order = require('../../models/orderSchema')
    const User = require('../../models/userSchema')
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

    const getOrderDetails = async (req,res)=>{
        const {orderId} = req.params
        try {
            const order = await Order.findById(orderId).populate('user').populate('orderItems.product')
            if(!order){
                res.status(HttpStatus.NOT_FOUND).send('Order not found')
            }
            return res.render('order-details',{order,moment})
        } catch (error) {
            console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
        }
    }
    


    const cancelOrder = async (req,res)=>{
        const {orderId} = req.params
        try {
            const order = await Order.findByIdAndUpdate(orderId,{status:'Cancelled'},{new:true})
            if(!order){
                return res.status(HttpStatus.NOT_FOUND).send('Order not found');
            }
            res.redirect('/admin/orderList')
        } catch (error) {
            console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
        }
    }



    const updateOrderStatus = async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
    
        try {
        const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orderList');
        }
        if (req.io) {
            req.io.emit('orderStatusChanged', {
            orderId: order._id,
            status: order.status,
            });
        }
    
        req.flash('success', 'Order status updated successfully');
        res.redirect('/admin/orderList');
        } catch (error) {
        console.error('Error updating status:', error);
        req.flash('error', 'Failed to update order status');
        res.redirect('/admin/orderList');
        }
    };


    module.exports = {
    getAllOrders,
    getOrderDetails,
    cancelOrder,
    updateOrderStatus,
    }