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

// Initialize Firebase Admin with environment variables
let db = null;
let firebaseInitialized = false;

async function initializeFirebase() {
    if (firebaseInitialized) return true;
    
    try {
        if (!process.env.FIREBASE_PRIVATE_KEY) {
            console.warn('Firebase Admin not initialized - FIREBASE_PRIVATE_KEY not found in environment variables');
            return false;
        }

        console.log('Initializing Firebase Admin...');
        
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID || 'alh-perfume',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\n')
        };

        // Check if Firebase app is already initialized
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        // Test the connection
        db = admin.firestore();
        await db.collection('test').doc('connection-test').get();
        
        console.log('✅ Firebase Admin initialized successfully');
        firebaseInitialized = true;
        return true;
        
    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error.message);
        db = null;
        return false;
    }
}

// Initialize Firebase when the server starts
initializeFirebase().catch(error => {
    console.error('Failed to initialize Firebase:', error);
});

// Create Razorpay order
app.post('/api/create-razorpay-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, orderData = {} } = req.body;
        
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const options = {
            amount: Math.round(amount), // Convert to paise
            currency,
            receipt: receipt || `order_${Date.now()}`,
            payment_capture: 1 // Auto capture payment
        };

        // Create Razorpay order
        const order = await razorpay.orders.create(options);
        
        // If Firebase is available, store the order
        if (db) {
            try {
                await db.collection('orders').doc(order.id).set({
                    ...orderData,
                    razorpayOrderId: order.id,
                    status: 'created',
                    amount: order.amount,
                    currency: order.currency,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (firebaseError) {
                console.error('Warning: Failed to save order to Firestore:', firebaseError);
                // Continue even if Firestore save fails
            }
        }
        
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
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    
    // Validate required parameters
    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        console.error('Missing required parameters:', { orderId, razorpayPaymentId: !!razorpayPaymentId, razorpayOrderId: !!razorpayOrderId });
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required parameters. Need orderId, razorpayPaymentId, razorpayOrderId, and razorpaySignature' 
        });
    }

    try {
        console.log(`Verifying payment for order: ${orderId}`);
        
        // Verify signature
        const text = `${razorpayOrderId}|${razorpayPaymentId}`;
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'Qwz5PXwqJY17MQq83SaLsxA1')
            .update(text)
            .digest('hex');

        if (generatedSignature !== razorpaySignature) {
            console.error('❌ Invalid signature received', {
                received: razorpaySignature,
                expected: generatedSignature,
                text
            });
            
            // Log failed verification attempt
            if (db) {
                try {
                    await db.collection('payment_attempts').add({
                        orderId,
                        razorpayOrderId,
                        razorpayPaymentId,
                        status: 'signature_mismatch',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        receivedSignature: razorpaySignature,
                        expectedSignature: generatedSignature
                    });
                } catch (logError) {
                    console.error('Failed to log failed verification attempt:', logError);
                }
            }
            
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid payment signature' 
            });
        }

        console.log(`✅ Payment signature verified for order: ${orderId}`);
        
        // If Firebase is available, update the order
        if (db) {
            try {
                const orderRef = db.collection('orders').doc(orderId);
                const updateData = {
                    'payment.status': 'completed',
                    'payment.razorpayPaymentId': razorpayPaymentId,
                    'payment.razorpayOrderId': razorpayOrderId,
                    'payment.verifiedAt': admin.firestore.FieldValue.serverTimestamp(),
                    'status': 'paid',
                    'updatedAt': admin.firestore.FieldValue.serverTimestamp()
                };
                
                await orderRef.update(updateData);
                console.log(`✅ Updated order status to paid: ${orderId}`);
                
            } catch (firestoreError) {
                console.error('❌ Firestore update error:', firestoreError);
                // Continue with the response even if Firestore update fails
                return res.status(200).json({ 
                    success: true,
                    orderId,
                    razorpayPaymentId,
                    warning: 'Payment verified but order status update failed',
                    error: firestoreError.message
                });
            }
        } else {
            console.warn('Firestore not available - skipping order status update');
        }
        
        // Return success response
        res.json({ 
            success: true,
            orderId,
            razorpayPaymentId,
            message: 'Payment verified successfully',
            timestamp: new Date().toISOString()
        });

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

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ALHH Backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
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
