const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')


const getSalesReport = async (req,res)=>{
    try {
        const { startDate, endDate, filterType } = req.query; // Dates from user input
        let matchQuery = {};

        if (startDate && endDate) {
            matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const salesData = await Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                    },
                    totalSales: { $sum: "$grandTotal" },
                    totalDiscount: { $sum: "$discount" },
                    totalOrders: { $sum: 1 },
                    totalCoupons: { $sum: "$couponAmount" },
                },
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
        ]);

        res.render("sales-report", { salesData, filterType, startDate, endDate });
    } catch (error) {
        console.error("Error generating sales report:", error);
        res.status(500).send("Internal Server Error");
    }
};



module.exports = {
    getSalesReport,
}