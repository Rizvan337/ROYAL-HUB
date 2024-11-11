    const mongoose = require('mongoose')
        const {Schema} = mongoose
const userSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
         unique:true,
        defaut:null
        
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
createdOn:{
    type:Date,
    default:Date.now,
},
searchHistory:[{
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
    },searchOn:{
        type:Date,
        default:Date.now
    }
}],
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type:Number,
        default:0,
    },
    whishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Whishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    referralCode:{
        type:String
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }], 
    profileImageUrl:{
        type:String,default:'/default-profile.jpg'
    },
    address: { type: String, required: false },

})

const User = mongoose.model("User",userSchema)
module.exports = User;