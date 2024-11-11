const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const HttpStatus = require('../../utils/httpStatusCodes')

//generate otp
function generateOtp(){
    const digits = "1234567890"
    let otp =""
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp;
}

//sending verification email 
const sendVerificationEmail = async (email,otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your otp for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP:${otp}</b>`,
        }
        const info = await transporter.sendMail(mailOptions)
        console.log("Email sent:",info.messageId);
        return true
    } catch (error) {
        console.error("Error sending email",error)
        return false
    }
}

//password hashing
const securePassword = async (password)=>{
    try {
        
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.error("Error hashing password:", error);  
        throw new Error("Password hashing failed");
    }

}

//forgot password page
const getForgotPassPage = async (req,res)=>{
    try {
      res.render('forgot-password',{user:req.user||null})
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

//sending email to renew forgot password
const forgotEmail = async (req,res)=>{
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email:email})
        if(findUser){
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email,otp)
        

        if(emailSent){
            req.session.userOtp = otp
            req.session.email = email
            res.render("forgotPass-otp",{user:req.user||null})
            console.log("OTP:",otp);
            
        }else{
            res.json({success:false, message:"Failed to send otp"})
        }
    }else{
        res.render('forgot-password',{message:"User with this email does not found"})

    }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}



//verifying forgott password otp 
const verifyForgotPassOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
        res.render('forgotPass-otp', { message: "OTP is not matching" });
        }
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"An Error Occured. Please try again later."})
    }
}

//reset password page
const getResetPassPage = async (req,res)=>{
    try {
        res.render('reset-password',{user:req.user||null})
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

//resend otp
const resendOtp = async (req,res)=>{
    try {
        const otp = generateOtp()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Resending OTP to email:",email);
        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(HttpStatus.OK).json({success:true,message:"Resend OTP Successfull"})
            
        }
        
    } catch (error) {
        console.error("Error in resend otp:",error)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"Internal server error"})
        
    }
}

//new password setting
const newPassword = async (req,res)=>{
    try {
        const {newPass,confirmPass} = req.body
        const email = req.session.email
        console.log("New password:", newPass);
        if(newPass===confirmPass){
            const passwordHash = await securePassword(newPass)
            console.log("Hashed password:", passwordHash);

            
           const updateResult = await User.updateOne({email:email},{$set:{password:passwordHash}})
            console.log("Update result:", updateResult)
            if (updateResult.modifiedCount > 0) {

                req.session.destroy((err)=>{
                    if(err){
                        console.log("Error destroying session",err)
                        res.redirect('/pageNotFound')
                    }else{
                        console.log("Session destroyed successfully. Redirecting to login.");
                        res.redirect('/login')
                    }
                })


            }

            
        }else{
            res.render('reset-password',{message:"Passwords do not match"})
        }   
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}




const userProfile = async (req,res)=>{
    try {
        const userId = req.session.user
        const userData = userId
        console.log(userId);
        
        res.render('userProfile',{user:userData})
    } catch (error) {
        console.error(error)
    }
}



const addressManage = async (req,res)=>{
    try {
        res.render('address-manage')
    } catch (error) {
        console.error(error)
    }
}

const changePassword = async (req,res)=>{
    try {
        const user = req.session.user
        res.render('change-pass',{user})
    } catch (error) {
        console.error(error)
    }
}

const changePasswordReady = async (req,res)=>{
    try {
        const {email} = req.body
        const userExists = await User.findOne({email})
        if(userExists){
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
                res.render('change-pass-otp',{user:userExists})
                console.log("OTP:",otp);
                
            }else{
                res.json({success:false,message:"Failed to sent OTP. Please try again"})
            }
        }else{
            res.render('change-pass',{user:null,message:"User with this email already exists"})
        }
    } catch (error) {
        console.log("Error in change password",error)
        res.redirect('/pageNotFound')
    }
} 
const verifyResetOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:'/reset-password'})
        }else{
            res.json({sucess:false,message:"Otp not matching"})
        }
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"An Error Occured.Please Try Again"})
    }
}


const editProfile = async (req,res)=>{
    try {
        res.render('editProfile')
    } catch (error) {
        
    }
}

const myOrders = async (req,res)=>{
    try {
        res.render('myOrders')
    } catch (error) {
        console.error(error)
    }
}


const addAddress = async (req,res)=>{
    try {
        const {name,address,city,landMark,pin,state,country,phone} = req.body
        console.log(name,address,city,landMark,pin,state,country,phone)
        const newAddress = new Address({
            userId:req.body.userId,
            address:req.body.address
        })
        await newAddress.save()
        res.status(HttpStatus.OK).json({message:"Added new address"})
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    getForgotPassPage,
    forgotEmail,    
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    newPassword,
    userProfile, 
    changePassword,
    changePasswordReady,
    addressManage,
    myOrders,
    addAddress,
    verifyResetOtp,
    editProfile,
}