// Core dependencies
const fs = require('fs');
const path = require('path');

// Environment variable loading logic
function loadEnvironment() {
    // Check if running in production (Render sets NODE_ENV=production)
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) {
        // In development, try to load from .env file
        const envPath = path.resolve(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            console.log('🔧 Loading .env file for development');
            require('dotenv').config({ path: envPath });
        } else {
            console.warn('⚠️  No .env file found, using system environment variables');
        }
    }

    // Verify required environment variables
    const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_CLIENT_CERT_URL',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:', missingVars.join(', '));
        if (isProduction) {
            console.error('Please set these variables in your Render dashboard under Environment');
        } else {
            console.error('Please create a .env file with these variables');
        }
        process.exit(1);
    }

    // Log environment status
    console.log('✅ Environment variables loaded');
    console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
    console.log('🏢 Firebase Project:', process.env.FIREBASE_PROJECT_ID);
    console.log('📧 Firebase Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('🔑 Firebase Private Key:', process.env.FIREBASE_PRIVATE_KEY ? '*** (loaded)' : 'Not set');
    console.log('💳 Razorpay Key ID:', process.env.RAZORPAY_KEY_ID ? '***' + process.env.RAZORPAY_KEY_ID.slice(-4) : 'Not set');
}

// Load environment variables
loadEnvironment();

// Core dependencies
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Log environment status
console.log('\n=== Environment Status ===');
console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${process.env.PORT || '10000'}`);
console.log(`Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID ? '***' + process.env.RAZORPAY_KEY_ID.slice(-4) : '❌ Not set'}`);
console.log(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID || '❌ Not set'}`);
console.log('=========================\n');

// Validate required environment variables
const requiredVars = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_CLIENT_CERT_URL'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.\n');
    process.exit(1);
}

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Firebase Admin initialization
let db = null;
let firebaseInitialized = false;

async function initializeFirebase(retryCount = 0) {
    // Reset state for re-initialization
    firebaseInitialized = false;
    db = null;
    const MAX_RETRIES = 3;
    const INITIAL_TIMEOUT = 10000; // 10 seconds

    try {
        console.log(`🚀 Initializing Firebase Admin (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
        
        // Verify required environment variables
        const requiredVars = [
            'FIREBASE_PROJECT_ID',
            'FIREBASE_CLIENT_EMAIL',
            'FIREBASE_PRIVATE_KEY',
            'FIREBASE_PRIVATE_KEY_ID',
            'FIREBASE_CLIENT_CERT_URL'
        ];

        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        
        // Format the private key (handle escaped newlines)
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

        const serviceAccount = {
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: privateKey,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID || '',
            auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
            token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
            universe_domain: 'googleapis.com'
        };

        if (admin.apps.length === 0) {
            try {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
                    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
                    httpAgent: new (require('https').Agent)({ 
                        keepAlive: true,
                        timeout: 30000, // 30 seconds
                        maxSockets: 100
                    })
                });
                console.log('✅ Firebase Admin SDK initialized');
            } catch (error) {
                console.error(`❌ Firebase initialization attempt ${retryCount + 1} failed:`, error.message);
                if (error.code) console.error('Error code:', error.code);
                if (error.stack) console.error('Stack trace:', error.stack.split('\n').slice(0, 3).join('\n'));
            }
        }
        
        // Configure Firestore with increased timeouts
        db = admin.firestore();
        try {
            db.settings({
                ignoreUndefinedProperties: true,
                timeout: 30000, // 30 seconds
                maxIdleTimeout: 60000, // 60 seconds
                maxConnections: 20
            });
        } catch (error) {
            console.error('Error configuring Firestore:', error.message);
            if (error.code) console.error('Error code:', error.code);
            if (error.stack) console.error('Stack trace:', error.stack.split('\n').slice(0, 3).join('\n'));
        }
        
        // Test connection with timeout
        const timeout = Math.min(INITIAL_TIMEOUT * Math.pow(2, retryCount), 60000); // Cap at 60 seconds
        console.log(`⏳ Testing Firestore connection (timeout: ${timeout}ms)...`);
        
        await Promise.race([
            db.collection('test').doc('connection-test').get({ timeout: 10000 }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Firestore connection timeout after ${timeout}ms`)), timeout)
            )
        ]);
        
        console.log('✅ Successfully connected to Firestore');
        firebaseInitialized = true;
        return true;
        
    } catch (error) {
        console.error(`❌ Firebase initialization attempt ${retryCount + 1} failed:`, error.message);
        
        if (retryCount < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
            console.log(`🔄 Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return initializeFirebase(retryCount + 1);
        }
        
        console.error('❌ Max retries reached. Firebase initialization failed.');
        if (error.code) console.error('Error code:', error.code);
        if (error.stack) console.error('Stack trace:', error.stack.split('\n').slice(0, 3).join('\n'));
        
        // Even if Firestore fails, we'll continue running the server in a degraded mode
        console.warn('⚠️  Running in degraded mode without Firestore. Some features may not work.');
        db = null;
        firebaseInitialized = false;
        return false;
    }
}

// Initialize Firebase when the server starts
const initFirebase = async () => {
    try {
        const success = await initializeFirebase();
        if (success) {
            console.log('🔥 Firebase initialization completed successfully');
            firebaseInitialized = true;
            
            // Test Firestore connection
            try {
                db = admin.firestore();
                await db.collection('test').doc('connection-test').get();
                console.log('✅ Successfully connected to Firestore');
                return true;
            } catch (firestoreError) {
                console.error('❌ Firestore connection error:', firestoreError.message);
                firebaseInitialized = false;
                return false;
            }
        } else {
            console.warn('⚠️  Firebase initialization completed with warnings');
            return false;
        }
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        firebaseInitialized = false;
        return false;
    }
};

// Start the server after Firebase initialization
const startServer = async () => {
    const port = process.env.PORT || 10000;
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`\n🚀 Server running on port ${port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔌 Firebase: ${firebaseInitialized ? '✅ Connected' : '❌ Disconnected'}`);
        console.log(`💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? '✅ Configured' : '❌ Not configured'}\n`);
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
};

// Initialize Firebase and start the server
initFirebase().then(() => {
    startServer();
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

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ALHH Backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            firebase: firebaseInitialized ? 'connected' : 'disconnected',
            razorpay: process.env.RAZORPAY_KEY_ID ? 'configured' : 'not configured'
        }
    });
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

// Start the server
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Firebase: ${firebaseInitialized ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? '✅ Configured' : '❌ Not configured'}\n`);
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
