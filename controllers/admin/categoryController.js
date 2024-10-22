const Category = require('../../models/categorySchema')
const HttpStatus = require('../../utils/httpStatusCodes')



const categoryInfo = async (req,res)=>{
    try {
            //checking page number from query
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


const getListCategory = async (req,res)=>{
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const getUnlistCategory = async (req,res)=>{
    try {
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


const getEditCategory = async (req,res)=>{
    try {
        const id = req.query.id
        const category = await Category.findOne({_id:id})
            res.render('edit-category',{category:category})
    } catch (error) {
        res.redirect('/pageerror')
    }
}


const editCategory = async (req,res)=>{
    try {
        const id = req.params.id
        const {categoryName,description} = req.body;
        const existingCategory = await Category.findOne({name:categoryName})
        if(existingCategory){
            return res.status(HttpStatus.BAD_REQUEST).json({error:"Category exists, Please choose another name"})
        }
        const updateCategory = await Category.findByIdAndUpdate(id,{
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