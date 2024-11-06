const mongoose = require('mongoose')
const { Schema } = mongoose

const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    }, 
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
        default: 0,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    productImage: {
        type: [String],
        required: true,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "Out of Stock", "Discontinued"],
        required: true,
        default: "Available"
    },
    stock:{
        type:Number
    }
},)

const Product = mongoose.model("Product", productSchema)
module.exports = Product