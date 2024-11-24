const connectDB = require('../config/db'); // Adjust the path as needed
const mongoose = require('mongoose');
const slugify = require('slugify');
const Product = require('../models/productSchema'); // Adjust the path as needed

// Connect to the database
connectDB();

// Migration Function
const migrateSlugs = async () => {
    try {
        const products = await Product.find();
        for (const product of products) {
            if (!product.slug) {
                product.slug = slugify(product.productName, { lower: true, strict: true });
                await product.save();
            }
        }
        console.log('Slugs migration completed!');
        mongoose.connection.close(); // Close the connection after migration
    } catch (error) {
        console.error('Error during slug migration:', error);
        mongoose.connection.close(); // Ensure the connection is closed on error
    }
};

// Run Migration
migrateSlugs();
