require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_RK9GfqxJRiUORI',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'Qwz5PXwqJY17MQq83SaLsxA1'
});

// Initialize Firebase Admin (if using Firebase)
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
} catch (error) {
    console.warn('Firebase Admin initialization skipped - serviceAccountKey.json not found');
}

const db = admin.firestore ? admin.firestore() : null;

// Create Razorpay order
app.post('/api/create-razorpay-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;
        
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const options = {
            amount: Math.round(amount), // Convert to paise
            currency,
            receipt: receipt || `order_${Date.now()}`,
            payment_capture: 1 // Auto capture payment
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
            receipt: order.receipt
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ 
            error: 'Failed to create order',
            details: error.error?.description || error.message 
        });
    }
});

// Verify payment
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        
        if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters' 
            });
        }
        
        // Verify signature
        const text = `${razorpayOrderId}|${razorpayPaymentId}`;
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'Qwz5PXwqJY17MQq83SaLsxA1')
            .update(text)
            .digest('hex');

        if (generatedSignature !== razorpaySignature) {
            console.error('Invalid signature received');
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid signature' 
            });
        }

        try {
            // Update order status in Firestore if available
            if (db) {
                const orderRef = db.collection('orders').doc(orderId);
                await orderRef.update({
                    'payment.status': 'completed',
                    'payment.razorpayPaymentId': razorpayPaymentId,
                    'payment.razorpayOrderId': razorpayOrderId,
                    'status': 'paid',
                    'updatedAt': admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            res.json({ 
                success: true,
                orderId,
                razorpayPaymentId,
                message: 'Payment verified successfully'
            });
            
        } catch (firestoreError) {
            console.error('Firestore update error:', firestoreError);
            // Even if Firestore update fails, we still confirm the payment was successful
            res.json({ 
                success: true,
                orderId,
                razorpayPaymentId,
                warning: 'Payment verified but order status update failed',
                error: firestoreError.message
            });
        }

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Payment verification failed',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

module.exports = app;
