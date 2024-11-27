const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    balance:{
        type:Number,
        default:0
    },
    transactions: [{
        amount: { type: Number },
        type: { type: String, enum: ['credit', 'debit'], required: true },
        date: { type: Date, default: Date.now },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        description: String,
      }],
})


const Wallet = mongoose.model('Wallet', walletSchema)

module.exports = Wallet
