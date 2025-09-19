// server.js
// --- Module Imports ---
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const moment = require('moment');

// --- Configuration ---
const app = express();
const port = 3000;

// --- Hardcoded Configuration Variables ---
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'mageshHiHello',
    database: 'arunjuna_shop'
};
const JWT_SECRET = 'your_super_secret_and_long_random_string_here';
const GOOGLE_CLIENT_ID = '189323019060-dh1aj9t6ua6319u7vpl2otjhn19ireea.apps.googleusercontent.com';
const ADMIN_EMAIL = 'mageshwaran.bmw.mmdu@gmail.com'; // NEW: Admin email for notifications
const ADMIN_EMAIL_PASSWORD = 'sukp hnrz fbbk wysy'; // IMPORTANT: Replace this with your Google App Password. See below for instructions.
// -----------------------------------------

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: ADMIN_EMAIL,
        pass: ADMIN_EMAIL_PASSWORD,
    },
});

// --- Security Middleware ---
const authMiddleware = (req, res, next) => {
    let token;
    const authHeader = req.header('Authorization');
    // Check for token in Authorization header
    if (authHeader) {
        token = authHeader.replace('Bearer ', '');
    }
    // Check for token in URL query parameter
    if (!token && req.query.token) {
        token = req.query.token;
    }
    
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
    
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};


const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ message: 'Access forbidden. Admin privileges required.' });
};

// --- Setup ---
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use(cors());
// --- Middleware setup: Use body-parser for all JSON payloads, but multer only for the upload route ---
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
const db = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 10, queueLimit: 0 }).promise();
db.getConnection().then(conn => { console.log('Database connected successfully!'); conn.release(); }).catch(err => console.error('ERROR CONNECTING TO DATABASE:', err.message));

// --- API Routes ---

// == AUTHENTICATION ==
app.post('/api/auth/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { name, email } = ticket.getPayload();
        let [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        let user = users[0];
        if (!user) {
            // Corrected: No password field needed for Google Sign-In
            const [result] = await db.query('INSERT INTO users (username, email, role) VALUES (?, ?, ?)', [name, email, 'user']);
            [users] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = users[0];
        }
        const appToken = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token: appToken, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(401).json({ message: 'Google login failed.' });
    }
});

// == IMAGE UPLOAD ==
// NOTE: Multer middleware is now correctly placed only on this route
app.post('/api/upload', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.json({ filePath: `/uploads/${req.file.filename}` });
});

// == PRODUCTS ==
app.get('/api/products', async (req, res) => {
    const [results] = await db.query('SELECT * FROM products');
    res.json(results);
});

app.post('/api/products', authMiddleware, adminMiddleware, [ body('name').notEmpty(), body('price').isFloat({ gt: 0 }), body('stock').isInt({ gt: -1 }) ], async (req, res) => {
    const { name, brand, description, price, stock, image_url } = req.body;
    const newProduct = { name, brand, description, price, stock, image_url };
    const [result] = await db.query('INSERT INTO products SET ?', newProduct);
    res.status(201).json({ id: result.insertId, ...newProduct });
});

app.put('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { name, brand, description, price, stock, image_url } = req.body;
    const updatedProduct = { name, brand, description, price, stock, image_url };
    const [result] = await db.query('UPDATE products SET ? WHERE id = ?', [updatedProduct, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });

    // The logic to send an email notification has been moved to the order creation endpoint.
    // This part of the code is now purely for admin-initiated product updates.

    res.json({ id: req.params.id, ...updatedProduct });
});

app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.status(204).send();
});

// == REVIEWS ==
app.post('/api/reviews', authMiddleware, async (req, res) => {
    try {
        const { product_id, rating, comment, image_url } = req.body;
        const { id: user_id, username } = req.user;
        if (!product_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Product ID and a valid rating are required.' });
        }
        const newReview = { product_id, user_id, username, rating, comment, image_url };
        const [result] = await db.query('INSERT INTO reviews SET ?', newReview);
        res.status(201).json({ success: true, id: result.insertId, ...newReview });
    } catch (error) {
        console.error("Failed to save review:", error);
        res.status(500).json({ success: false, message: 'An error occurred while saving the review.' });
    }
});

app.get('/api/reviews/:productId', async (req, res) => {
    const { productId } = req.params;
    const [reviews] = await db.query('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [productId]);
    res.json(reviews);
});

app.get('/api/reviews', authMiddleware, adminMiddleware, async (req, res) => {
    const sql = `SELECT r.id, r.rating, r.comment, r.created_at, u.username, p.name AS product_name FROM reviews r JOIN users u ON r.user_id = u.id JOIN products p ON r.product_id = p.id ORDER BY r.created_at DESC`;
    const [reviews] = await db.query(sql);
    res.json(reviews);
});

// == ORDERS (SIMPLIFIED) ==
app.post('/api/orders', authMiddleware, async (req, res) => {
    const { total_amount, items, payment_method, shipping_address } = req.body;
    const user_id = req.user.id;

    console.log('Received order payload:', JSON.stringify(req.body, null, 2));

    if (!payment_method) {
        return res.status(400).json({ success: false, error: 'Payment method is required to place an order.' });
    }
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check and decrement stock for each item
        for (const item of items) {
            const [product] = await connection.query('SELECT stock, name FROM products WHERE id = ? FOR UPDATE', [item.id]);
            if (product.length === 0 || product[0].stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ success: false, error: `Product with ID ${item.id} is out of stock or quantity is insufficient.` });
            }
            const newStock = product[0].stock - item.quantity;
            await connection.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.id]);

            // NEW: Low stock check for each item after the order is placed
            if (newStock > 0 && newStock < 10) {
                const mailOptions = {
                    from: ADMIN_EMAIL,
                    to: ADMIN_EMAIL,
                    subject: `Low Stock Alert: ${product[0].name}`,
                    html: `<p>The stock for **${product[0].name}** is critically low. There are only **${newStock}** units left.</p>
                           <p>Please order more stock soon to avoid running out.</p>`,
                };

                mailTransporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.error('Error sending low stock email:', error);
                    }
                    console.log('Low stock email sent:', info.response);
                });
            }
        }

        const [orderResult] = await connection.query('INSERT INTO orders (user_id, total_amount, status, payment_method) VALUES (?, ?, ?, ?)', [user_id, total_amount, 'Confirmed', payment_method]);
        const orderId = orderResult.insertId;

        if (shipping_address) {
            await connection.query('INSERT INTO order_address (order_id, full_name, mobile_number, email, address_line_1, address_line_2, city, postal_code, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                orderId,
                shipping_address.full_name,
                shipping_address.mobile_number,
                shipping_address.email,
                shipping_address.address_line_1,
                shipping_address.address_line_2,
                shipping_address.city,
                shipping_address.postal_code,
                shipping_address.country,
            ]);
        }
        
        if (items && items.length > 0) {
            const orderItems = items.map(item => [orderId, item.id, item.quantity, item.price]);
            await connection.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?', [orderItems]);
        }
        await connection.commit();
        res.status(201).json({ success: true, message: 'Order created successfully', orderId });

        // Send email to admin
        const mailOptions = {
            from: ADMIN_EMAIL,
            to: ADMIN_EMAIL,
            subject: `New Order Received! (#${orderId})`,
            html: `<p>A new order has been placed on the website.</p>
                   <p><strong>Order ID:</strong> #${orderId}</p>
                   <p><strong>Total Amount:</strong> Rs. ${parseFloat(total_amount).toFixed(2)}</p>
                   <p><strong>Number of Items:</strong> ${items.length}</p>
                   <p><strong>Payment Method:</strong> ${payment_method.toUpperCase()}</p>
                   <p>Please log in to the admin panel to view the full details.</p>`,
        };
        mailTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error('Error sending new order email:', error);
            }
            console.log('New order email sent:', info.response);
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Order creation failed:", error);
        res.status(500).json({ success: false, error: 'Failed to create order in database.' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/orders', authMiddleware, adminMiddleware, async (req, res) => {
    const sql = `SELECT o.id AS order_id, o.order_date, o.total_amount, o.status, u.username, o.payment_method, GROUP_CONCAT(p.name SEPARATOR ', ') AS products FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id GROUP BY o.id ORDER BY o.order_date DESC`;
    const [results] = await db.query(sql);
    res.json(results);
});

// FIX: Updated the query to handle orders without items and to explicitly group by all non-aggregated columns.
app.get('/api/orders/user/:userId', authMiddleware, async (req, res) => {
    if (req.user.id !== parseInt(req.params.userId, 10)) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const sql = `SELECT o.id AS order_id, o.order_date, o.total_amount, o.status, o.payment_method, COUNT(oi.product_id) AS item_count, GROUP_CONCAT(p.name SEPARATOR ', ') AS products, GROUP_CONCAT(oi.product_id SEPARATOR ',') AS product_ids FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id WHERE o.user_id = ? GROUP BY o.id, o.order_date, o.total_amount, o.status, o.payment_method ORDER BY o.order_date DESC`;
    const [results] = await db.query(sql, [req.params.userId]);
    res.json(results);
});

app.get('/api/orders/details/:orderId', authMiddleware, async (req, res) => {
    const { orderId } = req.params;
    const [orderCheck] = await db.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);
    if (orderCheck.length === 0 || (orderCheck[0].user_id !== req.user.id && req.user.role !== 'admin')) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const sql = `SELECT p.id as product_id, p.name, p.image_url, oi.quantity, oi.price, oa.full_name, oa.address_line_1, oa.address_line_2, oa.city, oa.postal_code, oa.country FROM order_items oi JOIN products p ON oi.product_id = p.id LEFT JOIN order_address oa ON oi.order_id = oa.order_id WHERE oi.order_id = ?`;
    const [items] = await db.query(sql, [orderId]);
    res.json(items);
});

// New route for fetching all order addresses for the admin panel
app.get('/api/orders/address', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [addresses] = await db.query('SELECT order_id, full_name, mobile_number, email, address_line_1, address_line_2, city, postal_code, country FROM order_address ORDER BY created_at DESC');
        res.json(addresses);
    } catch (error) {
        console.error('Failed to fetch order addresses:', error);
        res.status(500).json({ message: 'Failed to retrieve order addresses.' });
    }
});

app.put('/api/orders/:orderId/status', authMiddleware, adminMiddleware, async (req, res) => {
    const { status } = req.body;
    const { orderId } = req.params;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [userResult] = await connection.query('SELECT u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?', [orderId]);
        const userEmail = userResult[0]?.email;
        if (!userEmail) {
             throw new Error('User email not found for order.');
        }

        const [result] = await connection.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }
        await connection.commit();

        const mailOptions = {
            from: ADMIN_EMAIL,
            to: userEmail,
            subject: `Your Arunjuna Electricals Order #${orderId} Status Updated`,
            html: `<p>Dear customer,</p>
                   <p>The status of your order #${orderId} has been updated to <strong>${status}</strong>.</p>
                   <p>Thank you for your business!</p>`,
        };
        mailTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error('Error sending order status update email:', error);
            }
            console.log('Order status update email sent:', info.response);
        });

        res.json({ message: 'Order status updated successfully' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Failed to update order status:", error);
        res.status(500).json({ message: `Failed to update order status: ${error.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// == USER DETAILS ==
app.get('/api/user/details', authMiddleware, async (req, res) => {
    const [users] = await db.query('SELECT id, username, email, mobile_number FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not not found.' });
    res.json(users[0]);
});

app.put('/api/user/details', authMiddleware, [ body('username').notEmpty(), body('mobile_number').optional({ checkFalsy: true }).isMobilePhone('any') ], async (req, res) => {
    const { username, mobile_number } = req.body;
    await db.query('UPDATE users SET username = ?, mobile_number = ? WHERE id = ?', [username, mobile_number, req.user.id]);
    res.json({ message: 'Account information updated successfully.' });
});

// == PDF REPORTS ==
async function generateProductSalesPdf(productId, res) {
    try {
        const [product] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (product.length === 0) return res.status(404).send('Product not found.');

        const [salesData] = await db.query(`SELECT DATE_FORMAT(o.order_date, '%Y-%m') AS month, SUM(oi.quantity) AS total_quantity, SUM(oi.price * oi.quantity) AS total_revenue
                                            FROM order_items oi
                                            JOIN orders o ON oi.order_id = o.id
                                            WHERE oi.product_id = ?
                                            GROUP BY month
                                            ORDER BY month DESC`, [productId]);

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        const title = `Sales Report for ${product[0].name}`;
        const subtitle = `Generated on: ${moment().format('MMMM Do YYYY')}`;

        page.drawText(title, { x: 50, y: height - 50, size: 24, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
        page.drawText(subtitle, { x: 50, y: height - 75, size: 12, font: timesRomanFont, color: rgb(0.5, 0.5, 0.5) });

        let yPosition = height - 120;
        const lineHeight = 15;

        // Draw Product Details
        page.drawText(`Product ID: ${product[0].id}`, { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        yPosition -= lineHeight;
        page.drawText(`Name: ${product[0].name}`, { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        yPosition -= lineHeight;
        page.drawText(`Brand: ${product[0].brand}`, { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        yPosition -= lineHeight;
        page.drawText(`Price: Rs. ${parseFloat(product[0].price).toFixed(2)}`, { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        yPosition -= lineHeight;
        page.drawText(`Current Stock: ${product[0].stock}`, { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        yPosition -= lineHeight * 2;
        page.drawText('Sales Data:', { x: 50, y: yPosition, size: 16, font: timesRomanBoldFont });
        yPosition -= lineHeight;


        if (salesData.length === 0) {
            page.drawText('No sales data available for this product.', { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        } else {
            // Draw table headers
            yPosition -= 5;
            page.drawText('Month', { x: 50, y: yPosition, size: 12, font: timesRomanBoldFont });
            page.drawText('Quantity Sold', { x: 200, y: yPosition, size: 12, font: timesRomanBoldFont });
            page.drawText('Total Revenue', { x: 350, y: yPosition, size: 12, font: timesRomanBoldFont });
            yPosition -= lineHeight;

            // Draw table rows
            salesData.forEach(row => {
                const totalRevenue = parseFloat(row.total_revenue) || 0;
                page.drawText(row.month, { x: 50, y: yPosition, size: 12, font: timesRomanFont });
                page.drawText(String(row.total_quantity), { x: 200, y: yPosition, size: 12, font: timesRomanFont });
                page.drawText(`Rs. ${totalRevenue.toFixed(2)}`, { x: 350, y: yPosition, size: 12, font: timesRomanFont });
                yPosition -= lineHeight;
            });
        }

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="product-report-${productId}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Failed to generate product sales PDF:', error);
        res.status(500).json({ message: 'Failed to generate product sales PDF.' });
    }
}

async function generateAllProductsPdf(res) {
    try {
        const [products] = await db.query('SELECT * FROM products');
        
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        const drawHeader = (pageToDraw, titleText) => {
            pageToDraw.drawText(titleText, { x: 50, y: height - 50, size: 24, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
            pageToDraw.drawText(`Generated on: ${moment().format('MMMM Do YYYY')}`, { x: 50, y: height - 75, size: 12, font: timesRomanFont, color: rgb(0.5, 0.5, 0.5) });
            // Table headers
            const headers = ['ID', 'Name', 'Brand', 'Price', 'Stock'];
            const columnPositions = [50, 150, 300, 400, 500];
            headers.forEach((header, index) => {
                pageToDraw.drawText(header, {
                    x: columnPositions[index],
                    y: height - 120,
                    size: 12,
                    font: timesRomanBoldFont
                });
            });
        };

        let yPosition = height - 140;
        const lineHeight = 20;
        const bottomMargin = 50;

        if (products.length === 0) {
            drawHeader(page, 'All Products Report');
            page.drawText('No products found.', { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        } else {
            drawHeader(page, 'All Products Report');
            products.forEach((p) => {
                if (yPosition < bottomMargin) {
                    page = pdfDoc.addPage([600, 800]);
                    drawHeader(page, 'All Products Report (Continued)');
                    yPosition = height - 140; // Reset yPosition for new page content
                }

                const price = parseFloat(p.price) || 0;
                const columnPositions = [50, 150, 300, 400, 500];
                page.drawText(`${p.id}`, { x: columnPositions[0], y: yPosition, size: 12, font: timesRomanFont });
                page.drawText(`${p.name}`, { x: columnPositions[1], y: yPosition, size: 12, font: timesRomanFont });
                page.drawText(`${p.brand}`, { x: columnPositions[2], y: yPosition, size: 12, font: timesRomanFont });
                page.drawText(`Rs. ${price.toFixed(2)}`, { x: columnPositions[3], y: yPosition, size: 12, font: timesRomanFont });
                page.drawText(`${p.stock}`, { x: columnPositions[4], y: yPosition, size: 12, font: timesRomanFont });
                yPosition -= lineHeight;
            });
        }
        
        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="all-products-report.pdf"');
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Failed to generate all products PDF:', error);
        res.status(500).json({ message: 'Failed to generate all products PDF.' });
    }
}

async function generateAllOrdersPdf(res) {
    try {
        const sql = `SELECT o.id AS order_id, o.order_date, o.total_amount, o.status, u.username, o.payment_method, GROUP_CONCAT(p.name SEPARATOR ', ') AS products FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id GROUP BY o.id ORDER BY o.order_date DESC`;
        const [orders] = await db.query(sql);

        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        const drawHeader = (pageToDraw) => {
            pageToDraw.drawText('All Orders Report', { x: 50, y: height - 50, size: 24, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
            pageToDraw.drawText(`Generated on: ${moment().format('MMMM Do YYYY')}`, { x: 50, y: height - 75, size: 12, font: timesRomanFont, color: rgb(0.5, 0.5, 0.5) });
            // Table headers
            const headers = ['Order ID', 'Products', 'Customer', 'Date', 'Total', 'Status', 'Payment Method'];
            const columnPositions = [50, 120, 250, 320, 390, 440, 520]; 
            headers.forEach((header, index) => {
                pageToDraw.drawText(header, {
                    x: columnPositions[index],
                    y: height - 120,
                    size: 10,
                    font: timesRomanBoldFont
                });
            });
        };

        let yPosition = height - 140;
        const lineHeight = 20;
        const bottomMargin = 50;
        
        if (orders.length === 0) {
            drawHeader(page);
            page.drawText('No orders found.', { x: 50, y: yPosition, size: 12, font: timesRomanFont });
        } else {
            drawHeader(page);
            orders.forEach(o => {
                if (yPosition < bottomMargin) {
                    page = pdfDoc.addPage([600, 800]);
                    drawHeader(page);
                    yPosition = height - 140;
                }
                const totalAmount = parseFloat(o.total_amount) || 0;
                const columnPositions = [50, 120, 250, 320, 390, 440, 520];
                page.drawText(`#${o.order_id}`, { x: columnPositions[0], y: yPosition, size: 10, font: timesRomanFont });
                page.drawText(`${o.products}`, { x: columnPositions[1], y: yPosition, size: 10, font: timesRomanFont });
                page.drawText(`${o.username}`, { x: columnPositions[2], y: yPosition, size: 10, font: timesRomanFont });
                page.drawText(`${moment(o.order_date).format('MMM Do YYYY')}`, { x: columnPositions[3], y: yPosition, size: 10, font: timesRomanFont });
                page.drawText(`Rs. ${totalAmount.toFixed(2)}`, { x: columnPositions[4], y: yPosition, size: 10, font: timesRomanFont });
                page.drawText(`${o.status}`, { x: columnPositions[5], y: yPosition, size: 10, font: timesRomanFont });
                page.drawText(`${o.payment_method.toUpperCase()}`, { x: columnPositions[6], y: yPosition, size: 10, font: timesRomanFont });
                yPosition -= lineHeight;
            });
        }

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="all-orders-report.pdf"');
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Failed to generate all orders PDF:', error);
        res.status(500).json({ message: 'Failed to generate all orders PDF.' });
    }
}

async function generateSingleOrderPdf(orderId, res) {
    try {
        const sql = `SELECT p.name, p.image_url, oi.quantity, oi.price, o.total_amount, o.order_date, o.status, u.username, o.payment_method, oa.full_name, oa.address_line_1, oa.address_line_2, oa.city, oa.postal_code, oa.country
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    JOIN products p ON oi.product_id = p.id
                    JOIN users u ON o.user_id = u.id
                    LEFT JOIN order_address oa ON o.id = oa.order_id
                    WHERE o.id = ?`;
        const [items] = await db.query(sql, [orderId]);

        if (items.length === 0) return res.status(404).send('Order not found.');

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        const order = items[0];
        const title = `Invoice for Order #${orderId}`;
        const subtitle = `Customer: ${order.username} | Date: ${moment(order.order_date).format('MMMM Do YYYY')}`;
        const total = `Total Amount: Rs. ${parseFloat(order.total_amount).toFixed(2)}`;
        const status = `Status: ${order.status}`;
        const paymentMethod = `Payment Method: ${order.payment_method.toUpperCase()}`;
        
        let shippingAddress = 'Shipping Address: Not provided.';
        if (order.full_name && order.address_line_1 && order.city && order.postal_code) {
             shippingAddress = `
            Shipping to:
            ${order.full_name}
            ${order.address_line_1}
            ${order.address_line_2 ? order.address_line_2 + '\n' : ''}
            ${order.city}, ${order.postal_code}
            ${order.country}
            `.trim();
        }

        page.drawText(title, { x: 50, y: height - 50, size: 24, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
        page.drawText(subtitle, { x: 50, y: height - 75, size: 12, font: timesRomanFont, color: rgb(0.5, 0.5, 0.5) });
        page.drawText(total, { x: 50, y: height - 100, size: 16, font: timesRomanBoldFont });
        page.drawText(status, { x: 50, y: height - 120, size: 12, font: timesRomanFont });
        page.drawText(paymentMethod, { x: 50, y: height - 140, size: 12, font: timesRomanFont });
        page.drawText(shippingAddress, { x: 50, y: height - 200, size: 12, font: timesRomanFont, lineHeight: 18 });


        let yPosition = height - 280;
        const lineHeight = 15;
        
        items.forEach((item, index) => {
            page.drawText(`${index + 1}. ${item.name}`, { x: 50, y: yPosition, size: 12, font: timesRomanBoldFont });
            yPosition -= lineHeight;
            page.drawText(`Quantity: ${item.quantity} | Price: Rs. ${parseFloat(item.price).toFixed(2)}`, { x: 70, y: yPosition, size: 12, font: timesRomanFont });
            yPosition -= lineHeight;
            yPosition -= (lineHeight * 0.5); // Add some space
        });

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="order-invoice-${orderId}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Failed to generate single order PDF:', error);
        res.status(500).json({ message: 'Failed to generate single order PDF.' });
    }
}


app.get('/api/products/pdf', authMiddleware, adminMiddleware, (req, res) => generateAllProductsPdf(res));
app.get('/api/products/:productId/pdf', authMiddleware, adminMiddleware, (req, res) => generateProductSalesPdf(req.params.productId, res));
app.get('/api/orders/pdf', authMiddleware, adminMiddleware, (req, res) => generateAllOrdersPdf(res));
app.get('/api/orders/:orderId/pdf', authMiddleware, adminMiddleware, (req, res) => generateSingleOrderPdf(req.params.orderId, res));
app.get('/api/dashboard/pdf', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [totalRevenueResult] = await db.query(`SELECT o.id as order_id, o.order_date, oi.product_id, p.name AS product_name, oi.quantity, oi.price, o.total_amount, u.username
                                                   FROM orders o
                                                   JOIN order_items oi ON o.id = oi.order_id
                                                   JOIN products p ON oi.product_id = p.id
                                                   JOIN users u ON o.user_id = u.id
                                                   WHERE o.status != 'Cancelled' ORDER BY o.order_date DESC`);
        
        const [ordersResult] = await db.query(`SELECT o.id AS order_id, o.order_date, o.total_amount, o.status, u.username, o.payment_method, GROUP_CONCAT(p.name SEPARATOR ', ') AS products FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id GROUP BY o.id ORDER BY o.order_date DESC`);

        const [productsResult] = await db.query(`SELECT p.id as product_id, p.name as product_name, p.stock, p.price, SUM(oi.quantity) as total_sold
                                                FROM products p
                                                LEFT JOIN order_items oi ON p.id = oi.product_id
                                                GROUP BY p.id`);

        const [usersResult] = await db.query('SELECT id as user_id, username, email FROM users ORDER BY id');

        const pdfDoc = await PDFDocument.create();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        
        const generatePage = (titleText) => {
            const page = pdfDoc.addPage([600, 800]);
            const { width, height } = page.getSize();
            
            page.drawText(titleText, { x: 50, y: height - 50, size: 24, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
            page.drawText(`Generated on: ${moment().format('MMMM Do YYYY')}`, { x: 50, y: height - 75, size: 12, font: timesRomanFont, color: rgb(0.5, 0.5, 0.5) });
            
            return { page, width, height, timesRomanFont, timesRomanBoldFont };
        };
        
        const bottomMargin = 50;

        // --- Page 1: Total Revenue ---
        let { page: revenuePage, timesRomanFont: revenueFont, timesRomanBoldFont: revenueBold } = generatePage('Total Revenue Report');
        let yPosition = 700;
        const revenueLineHeight = 20;
        const revenueHeaders = ['Order ID', 'Product', 'User', 'Price', 'Quantity'];
        const revenueColumnPositions = [50, 160, 270, 380, 490];
        
        revenueHeaders.forEach((header, i) => {
            revenuePage.drawText(header, { x: revenueColumnPositions[i], y: yPosition, size: 12, font: revenueBold });
        });
        yPosition -= revenueLineHeight;

        let totalRevenue = 0;
        if (totalRevenueResult.length > 0) {
            totalRevenueResult.forEach(row => {
                if (yPosition < bottomMargin) {
                    revenuePage = pdfDoc.addPage([600, 800]);
                    const { height } = revenuePage.getSize();
                    revenuePage.drawText('Total Revenue Report (Continued)', { x: 50, y: height - 50, size: 24, font: revenueBold, color: rgb(0, 0, 0) });
                    yPosition = height - 120; // Reset yPosition for new page content
                    revenueHeaders.forEach((header, i) => {
                        revenuePage.drawText(header, { x: revenueColumnPositions[i], y: yPosition, size: 12, font: revenueBold });
                    });
                     yPosition -= revenueLineHeight;
                }
                const price = parseFloat(row.price) || 0;
                const quantity = parseInt(row.quantity) || 0;
                
                revenuePage.drawText(`#${row.order_id}`, { x: revenueColumnPositions[0], y: yPosition, size: 10, font: revenueFont });
                revenuePage.drawText(`${row.product_name}`, { x: revenueColumnPositions[1], y: yPosition, size: 10, font: revenueFont });
                revenuePage.drawText(`${row.username}`, { x: revenueColumnPositions[2], y: yPosition, size: 10, font: revenueFont });
                revenuePage.drawText(`Rs. ${price.toFixed(2)}`, { x: revenueColumnPositions[3], y: yPosition, size: 10, font: revenueFont });
                revenuePage.drawText(`${quantity}`, { x: revenueColumnPositions[4], y: yPosition, size: 10, font: revenueFont });
                totalRevenue += price * quantity;
                yPosition -= revenueLineHeight;
            });
        } else {
            revenuePage.drawText('No revenue data available.', { x: 50, y: yPosition, size: 12, font: revenueFont });
        }
        yPosition -= revenueLineHeight;
        revenuePage.drawText(`Total Revenue: Rs. ${totalRevenue.toFixed(2)}`, { x: 50, y: yPosition, size: 14, font: revenueBold, color: rgb(0.1, 0.5, 0.1) });

        // --- Page 2: Total Orders ---
        let { page: ordersPage, timesRomanFont: ordersFont, timesRomanBoldFont: ordersBold } = generatePage('Total Orders Report');
        yPosition = 700;
        const ordersLineHeight = 20;
        const ordersHeaders = ['Order ID', 'Products', 'Customer', 'Date', 'Total', 'Status', 'Payment Method'];
        const ordersColumnPositions = [50, 120, 250, 320, 390, 440, 520];
        
        ordersHeaders.forEach((header, i) => {
            ordersPage.drawText(header, { x: ordersColumnPositions[i], y: yPosition, size: 12, font: ordersBold });
        });
        yPosition -= ordersLineHeight;

        if (ordersResult.length > 0) {
            ordersResult.forEach(o => {
                if (yPosition < bottomMargin) {
                    ordersPage = pdfDoc.addPage([600, 800]);
                    const { height } = ordersPage.getSize();
                    ordersPage.drawText('All Orders Report (Continued)', { x: 50, y: height - 50, size: 24, font: ordersBold, color: rgb(0, 0, 0) });
                    // Table headers for new page
                    ordersHeaders.forEach((header, i) => {
                        ordersPage.drawText(header, { x: ordersColumnPositions[i], y: height - 120, size: 10, font: ordersBold });
                    });
                    yPosition = height - 140;
                }
                const totalAmount = parseFloat(o.total_amount) || 0;
                const columnPositions = [50, 120, 250, 320, 390, 440, 520];
                ordersPage.drawText(`#${o.order_id}`, { x: columnPositions[0], y: yPosition, size: 10, font: ordersFont });
                ordersPage.drawText(`${o.products}`, { x: columnPositions[1], y: yPosition, size: 10, font: ordersFont });
                ordersPage.drawText(`${o.username}`, { x: columnPositions[2], y: yPosition, size: 10, font: ordersFont });
                ordersPage.drawText(`${moment(o.order_date).format('MMM Do YYYY')}`, { x: columnPositions[3], y: yPosition, size: 10, font: ordersFont });
                ordersPage.drawText(`Rs. ${totalAmount.toFixed(2)}`, { x: columnPositions[4], y: yPosition, size: 10, font: ordersFont });
                ordersPage.drawText(`${o.status}`, { x: columnPositions[5], y: yPosition, size: 10, font: ordersFont });
                // FIX: Ensure o.payment_method is not null before calling toUpperCase
                ordersPage.drawText(`${o.payment_method ? o.payment_method.toUpperCase() : 'N/A'}`, { x: columnPositions[6], y: yPosition, size: 10, font: ordersFont });
                yPosition -= ordersLineHeight;
            });
        } else {
            ordersPage.drawText('No order data available.', { x: 50, y: yPosition, size: 12, font: ordersFont });
        }


        // --- Page 3: Total Products ---
        let { page: productsPage, timesRomanFont: productsFont, timesRomanBoldFont: productsBold } = generatePage('Total Products Report');
        yPosition = 700;
        const productsLineHeight = 20;
        const productsHeaders = ['Product ID', 'Product Name', 'Stock', 'Total Sold', 'Price'];
        const productsColumnPositions = [50, 150, 300, 400, 500];
        
        productsHeaders.forEach((header, i) => {
            productsPage.drawText(header, { x: productsColumnPositions[i], y: yPosition, size: 12, font: productsBold });
        });
        yPosition -= productsLineHeight;

        if (productsResult.length > 0) {
            productsResult.forEach(row => {
                if (yPosition < bottomMargin) {
                    productsPage = pdfDoc.addPage([600, 800]);
                    const { height } = productsPage.getSize();
                    productsPage.drawText('Total Products Report (Continued)', { x: 50, y: height - 50, size: 24, font: productsBold, color: rgb(0, 0, 0) });
                    yPosition = height - 120;
                    productsHeaders.forEach((header, i) => {
                        productsPage.drawText(header, { x: productsColumnPositions[i], y: yPosition, size: 12, font: productsBold });
                    });
                    yPosition -= productsLineHeight;
                }
                const totalSold = parseInt(row.total_sold) || 0;
                productsPage.drawText(`${row.product_id}`, { x: productsColumnPositions[0], y: yPosition, size: 10, font: productsFont });
                productsPage.drawText(`${row.product_name}`, { x: productsColumnPositions[1], y: yPosition, size: 10, font: productsFont });
                productsPage.drawText(`${row.stock}`, { x: productsColumnPositions[2], y: yPosition, size: 10, font: productsFont });
                productsPage.drawText(`${totalSold}`, { x: productsColumnPositions[3], y: yPosition, size: 10, font: productsFont });
                productsPage.drawText(`Rs. ${parseFloat(row.price).toFixed(2)}`, { x: productsColumnPositions[4], y: yPosition, size: 10, font: productsFont });
                yPosition -= productsLineHeight;
            });
        } else {
            productsPage.drawText('No product data available.', { x: 50, y: yPosition, size: 12, font: productsFont });
        }

        // --- Page 4: Total Users ---
        let { page: usersPage, timesRomanFont: usersFont, timesRomanBoldFont: usersBold } = generatePage('Total Users Report');
        yPosition = 700;
        const usersLineHeight = 20;
        const usersHeaders = ['User ID', 'Username', 'Email'];
        const usersColumnPositions = [50, 200, 350];
        
        usersHeaders.forEach((header, i) => {
            usersPage.drawText(header, { x: usersColumnPositions[i], y: yPosition, size: 12, font: usersBold });
        });
        yPosition -= usersLineHeight;

        if (usersResult.length > 0) {
            usersResult.forEach(row => {
                if (yPosition < bottomMargin) {
                    usersPage = pdfDoc.addPage([600, 800]);
                    const { height } = usersPage.getSize();
                    usersPage.drawText('Total Users Report (Continued)', { x: 50, y: height - 50, size: 24, font: usersBold, color: rgb(0, 0, 0) });
                    yPosition = height - 120;
                    usersHeaders.forEach((header, i) => {
                        usersPage.drawText(header, { x: usersColumnPositions[i], y: yPosition, size: 12, font: usersBold });
                    });
                    yPosition -= usersLineHeight;
                }
                usersPage.drawText(`${row.user_id}`, { x: usersColumnPositions[0], y: yPosition, size: 10, font: usersFont });
                usersPage.drawText(`${row.username}`, { x: usersColumnPositions[1], y: yPosition, size: 10, font: usersFont });
                usersPage.drawText(`${row.email}`, { x: usersColumnPositions[2], y: yPosition, size: 10, font: usersFont });
                yPosition -= usersLineHeight;
            });
        } else {
            usersPage.drawText('No user data available.', { x: 50, y: yPosition, size: 12, font: usersFont });
        }


        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="dashboard-report.pdf"');
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Failed to generate dashboard PDF:', error);
        res.status(500).json({ message: 'Failed to generate dashboard PDF.' });
    }
});

// New endpoint to reset the database
app.post('/api/reset-database', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        console.log('Resetting all data in the database...');
        // Order of truncation is important due to foreign key constraints
        await db.query('TRUNCATE TABLE reviews');
        await db.query('TRUNCATE TABLE order_items');
        await db.query('TRUNCATE TABLE order_address');
        await db.query('TRUNCATE TABLE orders');
        await db.query('TRUNCATE TABLE products');
        await db.query('TRUNCATE TABLE users');

        res.status(200).json({ success: true, message: 'Database has been cleared and auto-increment values reset.' });
    } catch (error) {
        console.error('Failed to reset database:', error);
        res.status(500).json({ success: false, message: 'Failed to reset the database.' });
    }
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.post('/api/contact', [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').trim().isEmail().withMessage('A valid email is required.'),
    body('message').trim().notEmpty().withMessage('Message cannot be empty.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map(e => e.msg).join(' ') });
    }

    const { name, email, message } = req.body;
    
    // Email to the administrator
    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: ADMIN_EMAIL,
        subject: `New Contact Form Submission from ${name}`,
        html: `<p>You have a new message from the contact form on your website.</p>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong><br>${message}</p>`,
    };
    
    try {
        await mailTransporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Message sent successfully. We will get back to you shortly!' });
    } catch (error) {
        console.error('Nodemailer error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message. Please try again later.' });
    }
});
