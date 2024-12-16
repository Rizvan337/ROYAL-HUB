// helpers/dashboardHelpers.js
const Order = require('../models/orderSchema');
const Product = require('../models/productSchema');
const Category = require('../models/categorySchema');

// Get orders by date range
async function getOrdersByDateRange(startDate, endDate) {
  return await Order.aggregate([
    {
      $match: {
        createdOn: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
  ]);
}

// Top 10 Best-Selling Products
async function getTopProducts() {
  return await Order.aggregate([
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        totalSold: { $sum: '$orderItems.quantity' },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails',
      },
    },
    { $unwind: '$productDetails' },
    {
      $project: {
        productName: '$productDetails.productName',
        totalSold: 1,
      },
    },
  ]);
}

// Top 10 Best-Selling Categories
async function getTopCategories() {
  return await Order.aggregate([
    { $unwind: '$orderItems' },
    {
      $lookup: {
        from: 'products',
        localField: 'orderItems.product',
        foreignField: '_id',
        as: 'productDetails',
      },
    },
    { $unwind: '$productDetails' },
    {
      $group: {
        _id: '$productDetails.category',
        totalSold: { $sum: '$orderItems.quantity' },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    { $unwind: '$categoryDetails' },
    {
      $project: {
        categoryName: '$categoryDetails.name',
        totalSold: 1,
      },
    },
  ]);
}

module.exports = { getOrdersByDateRange, getTopProducts, getTopCategories };
