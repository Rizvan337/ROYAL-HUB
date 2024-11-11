const mongoose = require('mongoose')
const {Schema} = mongoose

const cartSchema = new mongoose.Schema({
user:{
    type:Schema.Types.ObjectId,
    ref:'User',
    required:true
},
totalPrice:{
    type:Number,
    default:0
},
items:[{
  item:{
    type:Schema.Types.ObjectId,
    ref:'Product',
    required:true
  },
  qty:{
    type:Number,
    default:1,
    min:1
  },
  price:{
    type:Number,
    default:0,
    required:true
  },status:{
    type:String,
    default:"placed"
  },
    
    
}]
})


cartSchema.pre('save',function(next){
    this.totalPrice = this.items.reduce((total,item)=>total+item.qty*item.price,0)
    next()
})
const Cart = mongoose.model('Cart',cartSchema)
module.exports = Cart