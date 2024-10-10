// const User = require('../../models/userSchema')


// const customerInfo = async (req,res)=>{
//     try {
//         let search = "";
//         if(req.query.search){
//             search = req.query.search
//         }
//         let page=1;
//         if(req.query.page){
//             page = req.query.page
//         }
//         const limit=3
//         const userData = await User.find({
//             isAdmin:false,
//             $or:[
//                 {name:{$regex:".*"+search+".*"}},
//                 {email:{$regex:".*"+search+".*"}},
//             ],
//         })

//         .limit(limit*1)
//         .skip((page-1)*limit)
//         .exec()

//         const count = await User.find({
//             isAdmin:false,
//             $or:[
//                 {name:{$regex:".*"+search+".*"}},
//                 {email:{$regex:".*"+search+".*"}},
//             ],
//         }).countDocuments();
//         res.render('customers')
        
//     } catch (error) {
        
//     }
// }






// customerController.js
const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 3;

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } },
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } },
            ],
        });

        // Log view rendering attempt
        console.log('Rendering view: customers');
        
        // Render the view from admin
        res.render('customers', {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            searchQuery: search
        });

    } catch (error) {
        console.error('Error in customerInfo:', error);
        res.redirect('/pageerror');
    }
};

const customerBlocked = async (req,res)=>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const customerunBlocked = async (req,res)=>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
}