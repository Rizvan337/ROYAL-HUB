const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const profileController = require('../controllers/user/profileController')
const cartController = require('../controllers/user/cartController')
const passport = require("passport")
const { adminAuth,userAuth } = require('../middlewares/auth')



router.get('/', userController.loadHomepage)
router.get('/shop',userController.loadShop)
router.get('/pageNotFound', userController.pageNotFound)
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup',failureMessage: true }), (req, res) => {
    req.session.user = req.user;
   

    res.redirect('/');
})
router.get('/login', userController.loadLogin)
router.post('/login', userController.login)
router.get('/productDetails',userController.productDetails)
router.get('/forgot-password',profileController.getForgotPassPage)
router.post('/forgot-email',profileController.forgotEmail)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassPage)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.newPassword)


router.get('/shopTrue',userController.shoptrue)

//Cart 
router.post('/addToCart',userAuth,cartController.addToCart)
router.get('/cart',cartController.getCart)
router.post('/updateCart/:productId',cartController.updateCart)
router.post('/removeCart/:productId',cartController.deleteFromCart)
router.get('/logout', userController.logout)
module.exports = router;



