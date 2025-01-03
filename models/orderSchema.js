const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
const { schema } = require('./productSchema');

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  orderItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: false,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  // address: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Address',
  //   required: true,
  // },
  address: {
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    phone: { type: String, required: true },
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    required: true,
    enum: [
      'Pending',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Returned',
      'Return Request',
      'Confirmed',
      'Failed',
    ],
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  // paymentStatus:{
  //     type:String,
  //     enum:["Pending","Success","Failed"],
  //     required:true,
  // },
  paymentMethod: {
    type: String,
    required: true,
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  walletUsed: {
    type: Number,
    default: 0,
  },
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
