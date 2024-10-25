const User = require("../../models/userSchema")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const HttpStatus = require('../../utils/httpStatusCodes')


const shoptrue = async (req,res)=>{
    try {
       return res.render('shoptrue',{user:req.user||null})
    } catch (error) {
        
    }
}

//shop page
const loadShop = async (req, res) => {
    try {
        const user = req.session.user;

        // Get filters from query params
        const categoryFilters = req.query.categories ? req.query.categories.split(',') : [];
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : 0;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : Number.MAX_SAFE_INTEGER;

        // Fetch categories
        const categories = await Category.find({ isListed: true });

        // Build product filter query
        let filterQuery = {
            isBlocked: false,
            quantity: { $gt: 0 },
            salePrice: { $gte: minPrice, $lte: maxPrice }
        };

        if (categoryFilters.length > 0) {
            filterQuery.category = { $in: categoryFilters };
        }

        // Fetch filtered products
        let productData = await Product.find(filterQuery);

        // Sort and limit products
        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 12);

        res.render('shop', { user, products: productData, categories });
    } catch (error) {
        console.log("Shop page not found", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
    }
};


//home page
const loadHomepage = async (req, res) => {
    
    try {
        
            const user = req.session.user

            const categories = await Category.find({ isListed: true })
            let productData = await Product.find({
                isBlocked: false,
                category: { $in: categories.map(category => category._id) }, quantity: { $gt: 0 }
            })
            console.log(productData);

            productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            productData = productData.slice(0, 4);


            
            res.render('home', { user, products: productData });
      

    } catch (error) {
        console.log("Home page not found");
        console.log(error);
        
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
    }

};









//signup page
const loadSignup = async (req, res) => {
    try {
        if (req.session.user) {
            return res.redirect('/');
        } else {
            return res.render('signup')
        }
    } catch (error) {
        console.log("Home page is loading");
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error")

    }
}




//page not found
const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
//generating otp
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
//send email to verify
async function sendVerificationEmail(email, otp) {
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
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP:${otp}</b>`,
        })
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending Email", error);
        return false;

    }
}

//signup user
const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cPassword } = req.body
        if (password !== cPassword) {
            return res.render("signup", { message: "Password do not match" })
        }
        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render("signup", { message: "User with this email is already exists" })
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email-error")
        }

        req.session.userOtp = otp
        req.session.userData = { name, phone, email, password }

        res.render("Verify-otp")
        console.log("OTP sent", otp);

    } catch (error) {

        console.error("signup error", error);
        res.redirect("/pageNoFound")
    }
}
//password hashing
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {

    }
}
//verifying otp
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body
        console.log(otp)

        if (otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            })
            await saveUserData.save()
            req.session.user = saveUserData._id;
            res.json({ success: true, redirectUrl: '/' })
           
        }
        else {
            res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Invalid OTP, Please try again" })
        }
    } catch (error) {
        console.error("Error verifying OTP", error)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occured" })
    }
}






//resend otp
const resendOtp = async (req, res) => {
    try {
        const userData = req.session.userData;
        if (!userData || !userData.email) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Email not found in session" });
        }
        const { email } = userData;

        // Generate new OTP
        const otp = generateOtp();
        req.session.userOtp = otp; 

        // Send OTP via email
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(HttpStatus.OK).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error. Please try again." });
    }
};
//login page
const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('login')
        } else {
            res.redirect('/')
            
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
//login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const findUser = await User.findOne({ isAdmin: 0, email })
        console.log(findUser)
        if (!findUser) {
            return res.render("login", { message: "User not found" })
        }
        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by Admin" })
        }
        const passwordMatch = await bcrypt.compare(password, findUser.password)
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect password" })
        }
        req.session.user = findUser;


        
        res.redirect('/')
    } catch (error) {
        console.error("login error");
        res.render("login", { message: "login failed.Please try again later" })
    }
}

//logout user
const logout = async (req, res) => {
    try {
        req.session.user = null
        res.redirect('/login')
    } catch (error) {
        console.log("Logout error", error);
        res.redirect('/pageNotFound')

    }
}

//prouct detail page
const productDetails = async (req,res)=>{
    try {
        const productId = req.query.id
        const productDetails = await Product.findOne({_id:productId})
        console.log(productDetails)
       return res.render('product-details',{proData:productDetails})
    } catch (error) {
        
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShop,
    productDetails,
    shoptrue,

}

