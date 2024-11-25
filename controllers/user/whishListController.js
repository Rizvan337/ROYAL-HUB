const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')
const Whishlist = require('../../models/whishlistSchema')
const httpStatus = require('../../utils/httpStatusCodes')



const addToWhishList = async (req,res)=>{
try {
    
} catch (error) {
    
}
}


const getWhishListPage = async (req,res)=>{
try {
    const user = req.session.user
    const whishlist = await Whishlist.findOne({user}).populate({path:'products.product',select:'productName salePrice productImage'})
   if(!whishlist || whishlist.products.length===0){
    return res.render('whishlist',{whishlist:null,})
   }
    res.render('whishlist',{whishlist,user})
} catch (error) {
    
}
}



module.exports = {
   getWhishListPage,
   addToWhishList,
}