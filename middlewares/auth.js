const User = require('../models/userSchema')

const userAuth = (req,res,next)=>{
 if(req.session.user){
    User.findById(req.session.user)
    .then(data=>{
        if(data && !data.isBlocked){
            next()
        }else{
            res.redirect('/login')
        }
    })
    .catch(error=>{
        console.log("Errorn in user auth middleare");
        res.status(500).send("Internal Server error")
    })
        
 }else{
    res.redirect('/login')
 }
}


const adminAuth = (req,res,next)=>{
    const session = req.session.admin
    if(session){
        next()

        // //User.findOne({isAdmin:true})
        // .then(data=>{
        //     if(data){
        //         next()
        //     }else{
        //         res.redirect('/admin/login')
        //     }
        // })
        // .catch(error=>{
        //     console.log("Error in admin auth middleware");
        //     res.status(500).send("Internal server error")
        // })
    }else{
        res.redirect('/admin/login')
    }
}

    module.exports = {
        userAuth,
        adminAuth,
    }