const User = require('../../models/userSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const HttpStatus = require('../../utils/httpStatusCodes')


function generateOtp(){
    const digits = "1234567890"
    let otp =""
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp;
}

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


const securePassword = async (password)=>{
    try {
        
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.error("Error hashing password:", error);  
        throw new Error("Password hashing failed");
    }

}

const getForgotPassPage = async (req,res)=>{
    try {
      res.render('forgot-password',{user:req.user||null})
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


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




const verifyForgotPassOtp = async (req,res)=>{
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
        //    res.json({success:false,message:"OTP is not matching"})
        res.render('forgotPass-otp', { message: "OTP is not matching" });
        }
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"An Error Occured. Please try again later."})
    }
}


const getResetPassPage = async (req,res)=>{
    try {
        res.render('reset-password',{user:req.user||null})
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


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
           // res.redirect('/login',{user:req.user||null})
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










module.exports = {
    getForgotPassPage,
    forgotEmail,    
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    newPassword,

}