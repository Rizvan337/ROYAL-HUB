const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const PDFDocument = require('pdfkit'); 
const moment = require('moment')
const ExcelJS = require('exceljs')
const HttpStatus = require('../../utils/httpStatusCodes')
const salesReport = async (req, res) => {
    const { reportType, startDate, endDate } = req.query;
    
    let filter = {};
    let reportTypeName = "Daily Sales Report";
    
    
    if (reportType === 'weekly') {
        filter.createdOn = { $gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate() };
        reportTypeName = "Weekly Sales Report";
    } else if (reportType === 'monthly') {
        filter.createdOn = { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() };
        reportTypeName = "Monthly Sales Report";
    } else if (reportType === 'custom' && startDate && endDate) {
        filter.createdOn = { $gte: moment(startDate).startOf('day').toDate(), $lte: moment(endDate).endOf('day').toDate() };
        reportTypeName = "Custom Date Sales Report";
    } else {
        filter.createdOn = { $gte: moment().startOf('day').toDate() }; 
        reportTypeName = "Daily Sales Report";
    }

    try {
        
        const salesData = await Order.aggregate([
            { $match: filter },
            { $group: {
                _id: null,
                totalSales: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 },
                totalCancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
                totalDelivered: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] } },
                totalReturned: { $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] } },
                totalShipped: { $sum: { $cond: [{ $eq: ["$status", "Shipped"] }, 1, 0] } },
                totalProcessing: { $sum: { $cond: [{ $eq: ["$status", "Processing"] }, 1, 0] } },
                totalConfirmed: { $sum: { $cond: [{ $eq: ["$status", "Confirmed"] }, 1, 0] } },
                totalPending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
                totalDiscount: { $sum: "$discount" },
                totalCouponDiscount: { $sum: { $cond: [{ $eq: ["$couponApplied", true] }, "$discount", 0] } }
            }}
        ]);
        const Data={
            salesData: salesData,
            reportType: reportType,
            startDate: startDate || moment().format('YYYY-MM-DD'),
            endDate: endDate || moment().format('YYYY-MM-DD'),
            reportTypeName: reportTypeName,
        }

        req.session.Data=Data
        const orders = await Order.find({}).sort({createdOn:-1})
        res.render('sales-report', {
            salesData: salesData,
            reportType: reportType,
            startDate: startDate || moment().format('YYYY-MM-DD'),
            endDate: endDate || moment().format('YYYY-MM-DD'),
            reportTypeName: reportTypeName,
            orders,
            moment
        });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
    }
};







const generatePDFReport = (req, res) => {
    const { format, startDate, endDate, reportType } = req.query;
    
    const Data = req.session.Data
    console.log("Data",Data)

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
    
    doc.pipe(res);
    doc.fontSize(18).text(`${reportType} from ${startDate} to ${endDate}`, { align: 'center' });
    doc.fontSize(12).text('Sales Data:', { align: 'left' });
    

 
    const value = Data.salesData.forEach(Data => {
        doc.text(`Total Sales: ${Data.totalSales}`);
        doc.text(`Total Orders: ${Data.totalOrders}`);
        doc.text(`Total Cancelled: ${Data.totalCancelled}`);
        doc.text(`Total Delivered: ${Data.totalDelivered}`);
        doc.text(`Total Discount: ${Data.totalDiscount}`);
        doc.text(`Total Shipped: ${Data.totalShipped}`);
        doc.text(`Total Returned: ${Data.totalReturned}`);
        doc.text(`Total Processing: ${Data.totalProcessing}`);
        doc.text(`Total Confirmed: ${Data.totalConfirmed}`);
        doc.text(`Total Pending: ${Data.totalPending}`);
        doc.text(`Total Coupon Discount: ${Data.totalCouponDiscount}`);
    });
    
    doc.end();
};

const generateExcelReport = async (req, res) => {
    try {
        const Data = req.session.Data;
        const salesData = Data.salesData;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        
        worksheet.columns = [
            { header: 'Total Sales', key: 'totalSales', width: 15 },
            { header: 'Total Orders', key: 'totalOrders', width: 15 },
            { header: 'Total Cancelled', key: 'totalCancelled', width: 15 },
            { header: 'Total Delivered', key: 'totalDelivered', width: 15 },
            { header: 'Total Returned', key: 'totalReturned', width: 15 },
            { header: 'Total Shipped', key: 'totalShipped', width: 15 },
            { header: 'Total Confirmed', key: 'totalConfirmed', width: 15 },
            { header: 'Total Processing', key: 'totalProcessing', width: 15 },
            { header: 'Total Pending', key: 'totalPending', width: 15 },
            { header: 'Total Discount', key: 'totalDiscount', width: 15 },
            { header: 'Total Coupon Discount', key: 'totalCouponDiscount', width: 20 }
        ];

        salesData.forEach(data => {
            worksheet.addRow({
                totalSales: data.totalSales,
                totalOrders: data.totalOrders,
                totalCancelled: data.totalCancelled,
                totalDelivered: data.totalDelivered,
                totalPending: data.totalPending,
                totalReturned: data.totalReturned,
                totalShipped: data.totalShipped,
                totalConfirmed: data.totalConfirmed,
                totalProcessing: data.totalProcessing,
                totalDiscount: data.totalDiscount,
                totalCouponDiscount: data.totalCouponDiscount
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error');
    }
};




module.exports = {
    salesReport,
    generateExcelReport,
    generatePDFReport,
};
