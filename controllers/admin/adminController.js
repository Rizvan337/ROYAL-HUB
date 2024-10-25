const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

//page error
const pageerror = async (req,res)=>{
    res.render("admin-error")
}


//load login page of admin
const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin')
    }
    res.render('admin-login',{message:null})
}

//login to enter to admin dashboard
const login = async (req,res)=>{
try {
    const {email,password} = req.body
    console.log(req.body);
    
    const admin = await User.findOne({email,isAdmin:true})
    console.log(admin);
    
    if(admin){
        const passwordMatch = await bcrypt.compare(password,admin.password)
        console.log(passwordMatch);
        
        if(passwordMatch){
            req.session.admin = true;
            return res.redirect('/admin')
        } else{
            return res.redirect('/admin/login')
        }
    }else{
        return res.redirect('/admin/login')
    }
} catch (error) {
    console.log("Login error",error);
    return res.redirect('/pageerror')
    
}
}

//Load dashboard
const loadDashboard = async (req,res)=>{
   if(req.session.admin){
    try {
        res.render('dashboard')
    }
    
    
    catch (error) {
        res.redirect('/pageerror')
    }
   }else{
   return res.redirect('/admin/login')
   }
}


//logout
const logout = async (req,res)=>{
    try {
        req.session.admin = null
        res.redirect('/admin/login')
    } catch (error) {
        console.log("Unexpected error during logout",error);
        res.redirect('/pageerror')      
    }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
}