const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')
const Whishlist = require('../../models/whishlistSchema')
const HttpStatus = require('../../utils/httpStatusCodes')



const addToWhishList = async (req,res)=>{
try {
    const userId = req.session.user
    const {productId,quantity} = req.body
    console.log(req.body)
    const products = await Product.findById(productId)
    console.log("product find");
    
    if(!products){
        return res.status(HttpStatus.NOT_FOUND).json({message:"Product not found"})
    }
    let whishlist = await Whishlist.findOne({user:userId})
    console.log("find whishlist",whishlist);
    
    if(!whishlist){
         whishlist = new Whishlist({user:userId,products:[]})
    }
    console.log("created a new whishlist")

    const existingProductIndex = whishlist.products.findIndex(product=>product.product.toString()===productId)
    if(existingProductIndex > -1){  
        return res.status(HttpStatus.CONFLICT).json({ success: false, message: "Product is already in the wishlist" });
        
    }
        whishlist.products.push({product:productId,quantity:quantity||1})
    console.log(whishlist)
    await whishlist.save()
    return res.status(HttpStatus.OK).json({
        success: true,
        message: "Product added to wishlist successfully",
      });
} catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
}
}


const getWhishListPage = async (req,res)=>{
try {
    const user = req.session.user
    const page = parseInt(req.query.page)||1
    const limit = 2
    const skip = (page-1)*limit
    const whishlist = await Whishlist.findOne({user}).populate({path:'products.product',select:'productName salePrice productImage'}).skip(skip).limit(limit)
   if(!whishlist || whishlist.products.length===0){
    return res.render('whishlist',{whishlist:null,user})
   }
   const totalItems = whishlist.products.length;
   const totalPages = Math.ceil(totalItems/limit)

    res.render('whishlist',{
        whishlist,
        user,   
        products: whishlist.products.map(i => i.product),
        totalPages:totalPages,
        currentPage:page,
        totalItems: totalItems,
        

    
    })
} catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server error');
}
}


const removeFromWhishlist = async (req,res)=>{
    try {
        const {productId} = req.body
       
        const userId = req.session.user
       
        const whishlist = await Whishlist.findOne({user:userId})
       
        
        if(!whishlist){
            return res.status(HttpStatus.NOT_FOUND).json({ message: "Wishlist not found" });
        }
        const productIndex =  whishlist.products.findIndex((item)=>item.product.toString()===productId)
       
        
        if(productIndex > -1){
            whishlist.products.splice(productIndex,1)
            await whishlist.save()
            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Product removed from wishlist",
              });
        }else{
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: "Product not found in wishlist",
              });
        }   
        

    } catch (error) {
        console.error(error)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"Server error"});
    }
}


module.exports = {
   getWhishListPage,
   addToWhishList,
   removeFromWhishlist,
}