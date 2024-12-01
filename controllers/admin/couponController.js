const Coupon = require('../../models/couponSchema');
const HttpStatus = require('../../utils/httpStatusCodes');

const getCouponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const totalCoupons = await Coupon.countDocuments()
        const coupons = await Coupon.find().sort({_id:-1}).skip(skip).limit(limit) 
        const activeCoupons = coupons.filter(coupon => coupon.isActive === 'Active').length;
        const expiredCoupons = coupons.filter(coupon => coupon.isActive === 'Expired').length;
        const totalDiscounts = coupons.reduce((total, coupon) => total + (coupon.used * parseFloat(coupon.value)), 0);

        res.render('coupons', { activeCoupons, expiredCoupons, totalDiscounts, coupons,totalPages: Math.ceil(totalCoupons / limit),
            currentPage: page });
    } catch (error) {
        console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error loading coupons");
    }
};


const addCoupon = async (req, res) => {
    const { code, discountType, discountAmount, expiryDate, usageLimit, maxDiscount } = req.body;

    
    if (!code || code.length < 5 || code.length > 10) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Coupon code must be between 5 and 10 characters." });
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid discount type." });
    }
    if (!discountAmount || discountAmount <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Discount amount must be greater than zero." });
    }
    if (!expiryDate || new Date(expiryDate) < new Date()) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Expiry date must be a future date." });
    }
    if (!usageLimit || usageLimit < 1) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Usage limit must be at least 1." });
    }
    // if (!maxDiscount || maxDiscount > 1) {
    //     return res.status(HttpStatus.BAD_REQUEST).json({ error: "minimum purchase limit must be at least 1." });
    // }
    try {
        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(HttpStatus.CONFLICT).json({ error: "Coupon code already exists" });
        }
        const newCoupon = new Coupon({
            code,
            discountType,
            discountAmount,
            expiryDate,
            usageLimit,
            userCount: 0,
            isActive: true,
            // maxDiscount
        });
        await newCoupon.save();
        console.log("Coupon saved in DB");
        return res.status(HttpStatus.OK).json({ message: "Coupon added" });
    } catch (error) {
        console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Server error" });
    }
};


const removeCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id)
        await Coupon.findByIdAndDelete(id);
        console.log("deleted coupon")
        res.json({ message: "Coupon removed successfully" });
    } catch (error) {
        console.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Failed to remove coupon" });
    }
};


module.exports = {
    getCouponPage,
    addCoupon,
    removeCoupon,
    
}