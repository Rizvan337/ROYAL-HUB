const Category = require('../../models/categorySchema')
const HttpStatus = require('../../utils/httpStatusCodes')


//display category details(pagination)
const categoryInfo = async (req,res)=>{
    try {
            
            const page = parseInt(req.query.page) || 1;
            const limit = 4;
            const skip = (page-1)*limit;
            const categoryData = await Category.find({})
            .sort({createdAt:-1})
            .skip(skip)
            .limit(limit)
            const totalCategories = await Category.countDocuments()
            const totalPages = Math.ceil(totalCategories/limit)
            res.render("category",{
                cat:categoryData,
                currentPage:page,
                totalPages:totalPages,
                totalCategories:totalCategories
            })
    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
    }
}


//add category
const addCategory = async (req,res)=>{
    const {name,description} = req.body
    try {
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(HttpStatus.BAD_REQUEST).json({error:"Category Already exists"})
        }
        const newCategory = new Category({
            name,
            description,
        })
        await newCategory.save()
        return res.json({message:"Category added successfully"})
    } catch (error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({error:"Internal server error"})
    }
}

//unlist category 
const getListCategory = async (req,res)=>{
    try {
        let categoryId = req.query.id
        await Category.updateOne({_id:categoryId},{$set:{isListed:false}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


//list category
const getUnlistCategory = async (req,res)=>{
    try {
        let categoryId = req.query.id
        await Category.updateOne({_id:categoryId},{$set:{isListed:true}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


//edit category page
const getEditCategory = async (req,res)=>{
    try {
        const categoryId = req.query.id
        const category = await Category.findOne({_id:categoryId})
            res.render('edit-category',{category:category})
    } catch (error) {
        res.redirect('/pageerror')
    }
}

//edit category
const editCategory = async (req,res)=>{
    try {
        const categoryId = req.params.id
        const {categoryName,description} = req.body;
        const existingCategory = await Category.findOne({name:categoryName})
        if(existingCategory){
            return res.status(HttpStatus.BAD_REQUEST).json({error:"Category exists, Please choose another name"})
        }
        const updateCategory = await Category.findByIdAndUpdate(categoryId,{
            name:categoryName,
            description:description,
        },{new:true})

        if(updateCategory){
            res.redirect('/admin/category')
        }else{
            res.status(HttpStatus.NOT_FOUND).json({error:"Category not found"})
        }
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({error:"Internal server error"})
    }
}


module.exports = {
    categoryInfo,
    addCategory,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
}