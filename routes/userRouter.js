const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require("passport")
const { userAuth } = require('../middlewares/auth')
const profileController = require('../controllers/user/profileController')

router.get('/shop',userController.loadShop)
router.get('/', userController.loadHomepage)
router.get('/pageNotFound', userController.pageNotFound)
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    req.session.user = req.user;
    res.redirect('/');
})
router.get('/login', userController.loadLogin)
router.post('/login', userController.login)
router.get('/productDetails',userController.productDetails)





//profile controlling
router.get('/forgot-password',profileController.getForgotPassPage)
router.post('/forgot-email',profileController.forgotEmail)
router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassPage)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.newPassword)

router.get('/logout', userController.logout)
module.exports = router;



