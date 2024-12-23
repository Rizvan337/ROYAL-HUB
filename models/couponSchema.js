const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    default: 2,
  },
  userCount: {
    type: Number,
    default: 0,
  },
  usersUsed: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  isCouponApplied: {
    type: Boolean,
    default: false,
  },
  maxDiscount: {
    type: Number,
    required: true,
  },
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
