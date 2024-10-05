const User = require("../../models/userSchema")
    const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const loadHomepage = async (re,res)=>{
    try {
        return res.render('home')
    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("Server error")
        
    }
}

const loadSignup = async (req,res)=>{
    try {
       return res.render('signup')
    } catch (error) {
        console.log("Home page is loading");
        res.status(500).send("Server Error")
        
    }
}





const pageNotFound = async(req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp) {
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP:${otp}</b>`,
                })
                return info.accepted.length>0;
    } catch (error) {
        console.error("Error sending Email",error);
        return false;
        
    }
}


const signup = async(req,res)=>{
    try {
        const {name,phone,email,password,cPassword} = req.body
       if(password!==cPassword){
        return res.render("signup",{message:"Password do not match"})
       }
       const findUser = await User.findOne({email})
       if(findUser){
        return res.render("signup",{message:"User with this email is already exists"})
       }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json("email-error")
        }

        req.session.userOtp = otp
        req.session.userData = {name,phone,email,password}

        res.render("Verify-otp")
        console.log("OTP sent",otp);
        
    } catch (error) {
        
        console.error("signup error",error);
        res.redirect("/pageNoFound")
    }
}

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
}

    const verifyOtp = async (req,res)=>{
        try {
            const {otp} = req.body
            console.log(otp)

               if(otp===req.session.userOtp){
                const user = req.session.userData
                const passwordHash = await securePassword(user.password)
                const saveUserData = new User({
                    name:user.name,
                    email:user.email,
                    phone:user.phone,
                        password:passwordHash,
                })
                await saveUserData.save()
                req.session.user = saveUserData._id;
                res.json({success:true,redirectUrl:'/'})
            }
            else{
                res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
            }
        } catch (error) {
            console.error("Error verifying OTP",error)
            res.status(500).json({success:false,message:"An error occured"})
        }
    }

//chatgpt verify-otp
    // const verifyOtp = async (req, res) => {
    //     try {
    //         const { otp } = req.body;
    //         console.log(otp);
    
    //         if (otp === req.session.userOtp) {
    //             const user = req.session.userData;
    //             const passwordHash = await securePassword(user.password);
                
    //             // Create new user object without googleId if it's not provided
    //             const saveUserData = new User({
    //                 name: user.name,
    //                 email: user.email,
    //                 phone: user.phone,
    //                 password: passwordHash,
    //                 ...(user.googleId && { googleId: user.googleId }) // Only include googleId if it exists
    //             });
    
    //             await saveUserData.save();
    //             req.session.user = saveUserData._id;
    //             res.json({ success: true, redirectUrl: '/' });
    //         } else {
    //             res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
    //         }
    //     } catch (error) {
    //         console.error("Error verifying OTP", error);
    //         res.status(500).json({ success: false, message: "An error occurred" });
    //     }
    // };
 
    


    // const resendOtp = async (req,res)=>{
    //     try {
    //         console.log("Session userData:", req.session.userData);
    //         const {email} = req.session.userData;
    //         if(!email){
    //             return res.status(400).json({success:false,message:"Email not found in session"})
    //         }
    //         const otp = generateOtp();
    //         req.session.userOtp = otp;
    //         const emailSent = await sendVerificationEmail(email,otp);
    //         if(emailSent){
    //             console.log("Resend OTP",otp);
    //             res.status(200).json({success:true,message:"OTP Resend Successfully"})
    //         }else{
    //             res.status(500).json({success:false,message:"Failed to resend OTP.Please try again"})
    //         }
    //     } catch (error) {
    //         console.error("Error resending OTP");
    //         res.status(500).json({success:false,message:"Internal server error.Please try again"})
    //     }
    // }




    //resend otp-chatgpt
    const resendOtp = async (req, res) => {
        try {
            const userData = req.session.userData;
            if (!userData || !userData.email) {
                return res.status(400).json({ success: false, message: "Email not found in session" });
            }
            const { email } = userData;
    
            // Generate new OTP
            const otp = generateOtp();
            req.session.userOtp = otp; // Store OTP in session
    
            // Send OTP via email
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                console.log("Resend OTP:", otp);
                res.status(200).json({ success: true, message: "OTP Resent Successfully" });
            } else {
                res.status(503).json({ success: false, message: "Failed to resend OTP. Please try again." });
            }
        } catch (error) {
            console.error("Error resending OTP:", error);
            res.status(500).json({ success: false, message: "Internal server error. Please try again." });
        }
    };
    
module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
}