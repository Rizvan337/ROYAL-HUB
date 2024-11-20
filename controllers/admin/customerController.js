const User = require('../../models/userSchema');

//display customer details
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


        console.log('Rendering view: customers');


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

//block customer
const customerBlocked = async (req, res) => {
    try {
        let userId = req.query.id;
        await User.updateOne({ _id: userId }, { $set: { isBlocked: true } })
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

//unblock customer
const customerunBlocked = async (req, res) => {
    try {
        let userId = req.query.id;
        await User.updateOne({ _id: userId }, { $set: { isBlocked: false } })
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