const mongoose = require('mongoose')
const {Schema} = mongoose

const whishlistSchema = new mongoose.Schema({
 user:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true
 },
 products:[{
    product:{
        type:Schema.Types.ObjectId,
        ref:"Product",
        required:true,
    },
    quantity:{
        type:Number,
        default:1,
    },
    addedAt:{
        type:Date,
        default:Date.now()
    }
 }]
})

const Whishlist = mongoose.model('Whishlist',whishlistSchema)
module.exports = Whishlist