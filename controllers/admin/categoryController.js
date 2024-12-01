const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const HttpStatus = require('../../utils/httpStatusCodes')


//display category details(pagination)
const categoryInfo = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
        const totalCategories = await Category.countDocuments()
        const totalPages = Math.ceil(totalCategories / limit)
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        })
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
    }
}


//add category
const addCategory = async (req, res) => {
    const { name, description } = req.body
    const lowerCaseName = name.toLowerCase()
    try {

        const existingCategory = await Category.findOne({ name: lowerCaseName }).collation({ locale: 'en', strength: 2 })
        if (existingCategory) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: "Category Already exists" })
        }
        const newCategory = new Category({
            name: lowerCaseName,
            description,
        })
        await newCategory.save()
        return res.json({ message: "Category added successfully" })
    } catch (error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" })
    }
}

//unlist category 
const getListCategory = async (req, res) => {
    try {
        let categoryId = req.query.id
        await Category.updateOne({ _id: categoryId }, { $set: { isListed: false } })
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


//list category
const getUnlistCategory = async (req, res) => {
    try {
        let categoryId = req.query.id
        await Category.updateOne({ _id: categoryId }, { $set: { isListed: true } })
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


//edit category page
const getEditCategory = async (req, res) => {
    try {
        const categoryId = req.query.id
        const category = await Category.findOne({ _id: categoryId })
        res.render('edit-category', { category: category })
    } catch (error) {
        res.redirect('/pageerror')
    }
}

//edit category
const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.id
        const { categoryName, description } = req.body;
        const existingCategory = await Category.findOne({ name: categoryName })
        if (existingCategory) {
            return res.render('edit-category', {
                category: { _id: categoryId, name: categoryName, description: description },
                error: "Category exists, Please choose another name"
            })

        }
        const updateCategory = await Category.findByIdAndUpdate(categoryId, {
            name: categoryName,
            description: description,
        }, { new: true })

        if (updateCategory) {
            res.redirect('/admin/category')
        } else {
            res.status(HttpStatus.NOT_FOUND).json({ error: "Category not found" })
        }
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" })
    }
}

const addCategoryOffer = async (req,res)=>{
    try {
        const percentage = parseInt(req.body.percentage)
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)
        if(!category){
            return res.status(HttpStatus.NOT_FOUND).json({status:false,message:"Category not found"})
        }
        const products = await Product.find({category:categoryId})
        const hasProductOffer = products.some((product)=>product.productOffer>percentage)
        if(hasProductOffer){
            return res.json({status:false,message:"Product within this category already have product offer"})
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}})
        //category offer w not need to give offer in product
        for(const product of products){
            product.salePrice -= Math.floor(product.regularPrice*(percentage/100))
            product.productOffer = 0;
            
            await product.save()
        }
        res.json({status:true})
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status:false,message:"Internal server error"})
    }
}





const removeCategoryOffer = async (req,res)=>{
    try {
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)
        if(!category){
            return res.status(HttpStatus.NOT_FOUND).json({status:false,message:"Category not found"})
        }
        const percentage = category.categoryOffer
        const products = await Product.find({category:category._id})
        if(products.length>0){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice*(percentage/100))
                product.productOffer = 0
                await product.save()
            }
        }
        category.categoryOffer = 0
        await category.save()
        res.json({status:true})
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status:false,message:"Internal server error"})
    }
}
module.exports = {
    categoryInfo,
    addCategory,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    addCategoryOffer,
    removeCategoryOffer,
}