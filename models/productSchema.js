const mongoose = require('mongoose')
const slugify = require('slugify');
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
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    slug:{
        type:String,
        unique:true,
        
    },

}, { timestamps: true })

productSchema.pre('save', function (next) {
    if (this.isModified('productName')) {
        this.slug = slugify(this.productName, { lower: true, strict: true });
    }
    next();
});

const Product = mongoose.model("Product", productSchema)
module.exports = Product