const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const HttpStatus = require('../../utils/httpStatusCodes')
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const Wallet = require('../../models/walletSchema')
const PDFDocument = require('pdfkit')

//generate otp
function generateOtp() {
    const digits = "1234567890"
    let otp = ""
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)]
    }
    return otp;
}

//sending verification email 
const sendVerificationEmail = async (email, otp) => {
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
        console.log("Email sent:", info.messageId);
        return true
    } catch (error) {
        console.error("Error sending email", error)
        return false
    }
}

//password hashing
const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Password hashing failed");
    }

}

//forgot password page
const getForgotPassPage = async (req, res) => {
    try {
        res.render('forgot-password', { user: req.user || null })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

//sending email to renew forgot password
const forgotEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp)


            if (emailSent) {
                req.session.userOtp = otp
                req.session.email = email
                res.render("forgotPass-otp", { user: req.user || null })
                console.log("OTP:", otp);

            } else {
                res.json({ success: false, message: "Failed to send otp" })
            }
        } else {
            res.render('forgot-password', { message: "User with this email does not found" })

        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}



//verifying forgott password otp 
const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/reset-password" })
        } else {
            res.render('forgotPass-otp', { message: "OTP is not matching" });
        }
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "An Error Occured. Please try again later." })
    }
}

//reset password page
const getResetPassPage = async (req, res) => {
    try {
        res.render('reset-password', { user: req.user || null })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

//resend otp
const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Resending OTP to email:", email);
        const emailSent = await sendVerificationEmail(email, otp)
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(HttpStatus.OK).json({ success: true, message: "Resend OTP Successfull" })

        }

    } catch (error) {
        console.error("Error in resend otp:", error)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" })

    }
}

//new password setting
const newPassword = async (req, res) => {
    try {
        const { newPass, confirmPass } = req.body
        const email = req.session.email
        console.log("New password:", newPass);
        if (newPass === confirmPass) {
            const passwordHash = await securePassword(newPass)
            console.log("Hashed password:", passwordHash);


            const updateResult = await User.updateOne({ email: email }, { $set: { password: passwordHash } })
           
            if (updateResult.modifiedCount > 0) {

                req.session.destroy((err) => {
                    if (err) {
                        
                        res.redirect('/pageNotFound')
                    } else {
                        console.log("Session destroyed successfully. Redirecting to login.");
                        res.redirect('/login')
                    }
                })


            }


        } else {
            res.render('reset-password', { message: "Passwords do not match" })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}




const userProfile = async (req, res) => {
    try {
        const userId = req.session.user._id
        const userData = await User.findById(userId)
        

        res.render('userProfile', { user: userData })
    } catch (error) {
        console.error(error)
    }
}




const changePassword = async (req, res) => {
    try {
        const user = req.session.user
        res.render('change-pass', { user })
    } catch (error) {
        console.error(error)
    }
}

const changePasswordReady = async (req, res) => {
    try {
        const { email } = req.body
        const userExists = await User.findOne({ email })
        if (userExists) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp)
            if (emailSent) {
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
                res.render('change-pass-otp', { user: userExists })
                console.log("OTP:", otp);

            } else {
                res.json({ success: false, message: "Failed to sent OTP. Please try again" })
            }
        } else {
            res.render('change-pass', { user: null, message: "User with this email already exists" })
        }
    } catch (error) {
        console.log("Error in change password", error)
        res.redirect('/pageNotFound')
    }
}
const verifyResetOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: '/reset-password' })
        } else {
            res.json({ sucess: false, message: "Otp not matching" })
        }
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "An Error Occured.Please Try Again" })
    }
}


const getEditProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        res.render('editProfile', { user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("Internal Server Error");
    }
};

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user
        const { name, phone } = req.body
        const updatedUser = await User.findByIdAndUpdate(userId, { name, phone }, { new: true })
        if (!updatedUser) {
            return res.status(HttpStatus.NOT_FOUND).send("User not found");
        }
        req.session.user = updatedUser
        req.session.save((err) => {
            if (err) {
                console.error("Error saving session:", err);
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
            } else {
                return res.redirect('/userProfile')
            }

        })

    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
}

const myOrders = async (req, res) => {
    const { page = 1, limit = 5 } = req.query; 
    try {
        
        const orders = await Order.find({ user: req.session.user }).skip((page - 1) * limit)
        .limit(parseInt(limit)).populate({path:'orderItems.product',select:'productImage productName'}).sort({ createdOn: -1 })
        const totalOrders = await Order.countDocuments({ user: req.session.user });
        res.render('my-orders', { orders: orders, moment ,currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / limit),})
    } catch (error) {
        console.error(error)
    }
}


const getUserOrderDetails = async (req,res)=>{
    try {
        const { id } = req.params
        const order = await Order.findById(id).populate('orderItems.product').populate('address')
        res.render('user-orderdetails',{order,moment})
    } catch (error) {
        console.error('Error fetching order details:', error);
    res.status(500).send('Server Error');
    }
}

const cancelOrder = async (req, res) => {
    const userId = req.session.user
    const { orderId } = req.params
    try {
        const order = await Order.findByIdAndUpdate(orderId, { status: "Cancelled" }, { new: true })
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }


        for(let item of order.orderItems){
            const  productId = item.product
            const quantity = item.quantity
            const product = await Product.findById(productId)
            if(product){
              product.stock += quantity
              await product.save()
            }
          }

         
          if(order.paymentMethod === "Razorpay" || order.paymentMethod === "Wallet"){
            const wallet = await Wallet.findOne({userId})
           
          if(wallet){
            
            wallet.balance += order.finalAmount
            wallet.transactions.push({
                amount:order.finalAmount,
                type:"credit",
                orderId:order._id,
                description:"Refund for cancel order"
            })
          await wallet.save()
        
          }
        }
        if (req.io) {
            req.io.emit('orderStatusChanged', { orderId: order._id, status: 'Cancelled' })
        }
        res.json({ success: true })

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server Error' });
    }
}


const returnOrder = async(req,res)=>{
    try {
        const userId = req.session.user
        const {orderId} = req.params;
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }
        if(order.status!=="Delivered"){
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Only delivered orders can be returned' });
        }
       order.status = "Returned"
       await order.save()
   for(let items of order.orderItems){
  const productId = items.product;
  const quantity = items.quantity;
  const product = await Product.findById(productId)
if(product){
    product.stock +=quantity
    await product.save()
}
}
if(order.paymentMethod==="Razorpay"){
    const wallet = await Wallet.findOne({userId})
    if(wallet){
        wallet.balance += order.finalAmount
        wallet.transactions.push({
            amount:order.finalAmount,
            type:"credit",
            orderId:order._id,
            description:"Refund for cancel order"
        })
        await wallet.save()
    }
}
    if(req.io){
        req.io.emit('orderStatusChanged',{orderId:order._id,status:'Returned'})
    }
    res.status(HttpStatus.OK).json({ success: true, message: 'Order returned successfully' });
    } catch (error) {
        console.error('Error returning order:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server Error' });
    }
}


const downloadInvoice = async (req, res) => {
    try {
      const { orderId } = req.params;
  
      const order = await Order.findById(orderId).populate('orderItems.product').populate('user');
      if (!order) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: 'Order not found' });
      }
  
      const invoicesDir = path.join(__dirname, '../invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }
  
      const pdfPath = path.join(invoicesDir, `invoice-${orderId}.pdf`);
  
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);
  
      // Add Invoice Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Invoice', { align: 'center' })
        .moveDown(1);
  
      // Add Order Information
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Order ID: ${order._id}`, { align: 'left' })
        .text(`Date: ${new Date(order.invoiceDate).toLocaleDateString()}`, { align: 'left' })
        .text(`Customer: ${order.user.name || 'N/A'}`, { align: 'left' })
        .text(`Status: ${order.status}`, { align: 'left' })
        .moveDown(2);
  
      // Add Table Header
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Product Name', 50, doc.y, { width: 200 })
        .text('Quantity', 250, doc.y, { width: 100, align: 'center' })
        .text('Price', 350, doc.y, { width: 100, align: 'right' })
        .moveTo(50, doc.y + 5)
        .lineTo(500, doc.y + 5)
        .stroke()
        .moveDown(0.5);
  
      // Add Order Items
      order.orderItems.forEach((item) => {
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(item.product.productName, 50, doc.y, { width: 200 })
          .text(item.quantity.toString(), 250, doc.y, { width: 100, align: 'center' })
          .text(`Rs. ${item.price.toFixed(2)}`, 350, doc.y, { width: 100, align: 'right' });
      });
  
      // Add Total
      doc
        .moveDown(1)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Total: Rs. ${order.finalAmount.toFixed(2)}`, { align: 'right' });
  
      // Footer
      doc
        .moveDown(2)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('Thank you for your order!', { align: 'center' });
  
      doc.end();
  
      writeStream.on('finish', () => {
        return res.download(pdfPath);
      });
  
      writeStream.on('error', (error) => {
        console.error('Error writing the file:', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Could not generate invoice');
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Could not generate invoice');
    }
  };
  
//address management
const getAddresses = async (req, res) => {
    const userId = req.session.user._id;
    try {
        const addresses = await Address.find({ userId });
        res.render('address-manage', { addresses, user: req.session.user });
    } catch (error) {
        console.error(error);
        res.redirect('/userProfile');
    }
};


// Add a new address
const addAddress = async (req, res) => {
    const { title, name, phone, street, city, state, zip } = req.body;
    const userId = req.session.user._id;
    try {
        await new Address({ userId, title, name, phone, street, city, state, zip }).save();
        res.redirect('/addressManage');
    } catch (error) {
        console.error(error);
        res.redirect('/addressManage');
    }
};

// Edit address
const editAddress = async (req, res) => {
    const addressId = req.params.id;
    const { title, name, phone, street, city, state, zip } = req.body;
    try {
        await Address.findByIdAndUpdate(addressId, { title, name, phone, street, city, state, zip });
        res.redirect('/addressManage');
    } catch (error) {
        console.error(error);
        res.redirect('/addressManage');
    }
};

// Delete address
const deleteAddress = async (req, res) => {
    const addressId = req.params.id;
    try {
        await Address.findByIdAndDelete(addressId);
        res.redirect('/addressManage');
    } catch (error) {
        console.error(error);
        res.redirect('/addressManage');
    }
};

//change email
const getChangeEmail = async (req, res) => {
    try {
        const user = req.session.user
        res.render('change-email', { user })
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const changeEmail = async (req, res) => {
    try {

        const { email } = req.body
       
        const userExists = await User.findOne({ email })
       

        if (userExists) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp)
            if (emailSent) {
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
                res.render('change-email-otp', { user: req.session.user })
                console.log("OTP:", otp);
                console.log('email:', email);
            } else {
                res.json("email-error")
            }
        } else {
            res.render('change-email', { message: "User with this email not exists" })
        }
    } catch (error) {
        res.redirect('pageNotFound')
    }
}


const verifyEmailOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp
        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData
            res.render('new-email', { userData: req.session.userData, user: req.session.user })
        } else {
            res.render('change-email-otp', {
                message: "OTP not matching",
                userData: req.session.userData,
                user: req.session.user
            })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
const updateEmail = async (req, res) => {
    try {
        const newEmail = req.body.newEmail
        const userId = req.session.user
        await User.findByIdAndUpdate(userId, { email: newEmail })
        res.redirect('/userProfile')

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const getWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        const { page = 1, limit = 5 } = req.query;
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            res.render('wallet', { wallet: { balance: 0, transactions: [] }, moment });
            return;
        }
        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / pageSize);
        const transactions = wallet.transactions
            .sort((a, b) => b.date - a.date)
            .slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        res.render('wallet', {
            wallet: {
                balance: wallet.balance,
                transactions,
                totalTransactions,
                currentPage: pageNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
               
            },
            moment,
        });
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).send("Internal Server Error");
    }
};



const addWalletMoney = async (req, res) => {
    const { amount, description } = req.body;
    const userId = req.session.user;

    try {
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });
        }
        const transaction = {
            amount: parseFloat(amount),
            type: 'credit',
            description: description || 'Added to wallet',
        };
        wallet.transactions.push(transaction);
        wallet.balance += transaction.amount;
        await wallet.save();
        res.redirect('/getWallet');
    } catch (err) {
        console.error(err);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};


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
    getAddresses,
    addAddress,
    deleteAddress,
    editAddress,
    myOrders,
    getUserOrderDetails,
    cancelOrder,
    returnOrder,
    downloadInvoice,
    verifyResetOtp,
    getEditProfile,
    editProfile,
    updateEmail,
    getChangeEmail,
    changeEmail,
    verifyEmailOtp,
    getWallet,
    addWalletMoney,
}