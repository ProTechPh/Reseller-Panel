import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

// Fix for Windows / ISP DNS blocking MongoDB SRV queries (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // fallback silently if system restricts dns setting
}

// 1. Parse .env.local manually to get MONGODB_URI
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// 2. Define Schema Interfaces inline or import them
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'reseller'], required: true },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

const ProductPriceSchema = new mongoose.Schema({
  duration: { type: String, required: true },
  price: { type: Number, required: true },
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: false },
  prices: [ProductPriceSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ['purchase', 'balance_add', 'balance_deduct'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const LicenseKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  resellerId: { type: mongoose.Schema.Types.ObjectId, required: false },
  duration: { type: String, required: true },
  price: { type: Number, required: false },
  isSold: { type: Boolean, default: false },
  soldAt: { type: Date, required: false },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const LicenseKey = mongoose.models.LicenseKey || mongoose.model('LicenseKey', LicenseKeySchema);

async function runSeed() {
  console.log('Connecting to database:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI!);
  
  console.log('Clearing existing collections...');
  await User.deleteMany({});
  await Product.deleteMany({});
  await Transaction.deleteMany({});
  await LicenseKey.deleteMany({});

  console.log('Creating Admin Account...');
  const adminSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', adminSalt);
  await User.create({
    username: 'admin',
    passwordHash: adminPasswordHash,
    role: 'admin',
    balance: 0,
  });
  console.log('Admin account created: user="admin" pass="admin123"');

  console.log('Creating Reseller Account...');
  const resellerSalt = await bcrypt.genSalt(10);
  const resellerPasswordHash = await bcrypt.hash('reseller123', resellerSalt);
  const reseller = await User.create({
    username: 'reseller1',
    passwordHash: resellerPasswordHash,
    role: 'reseller',
    balance: 10000.00, // PHP 10,000.00
  });
  console.log('Reseller account created: user="reseller1" pass="reseller123" balance=₱10000.00');

  // Log initial balance transaction
  await Transaction.create({
    userId: reseller._id,
    type: 'balance_add',
    amount: 10000.00,
    description: 'Initial balance seeded in Philippine Peso (PHP)',
  });

  console.log('Creating Mock Games with standardized time durations...');
  const products = [
    {
      name: 'Mobile Legends: Bang Bang',
      description: 'Diamond keys and activation codes for MLBB premium items.',
      image: '/images/mlbb.png',
      prices: [
        { duration: '1 Day', price: 50.00 },
        { duration: '7 Days', price: 150.00 },
        { duration: '30 Days', price: 500.00 }
      ],
      isActive: true,
    },
    {
      name: 'Call of Duty: Mobile',
      description: 'CODM Garena Shells and premium license codes.',
      image: '/images/codm.png',
      prices: [
        { duration: '1 Day', price: 120.00 },
        { duration: '7 Days', price: 500.00 },
        { duration: '30 Days', price: 1500.00 }
      ],
      isActive: true,
    },
    {
      name: 'PUBG Mobile',
      description: 'UC codes and VIP keys for PUBG global region activation.',
      image: '/images/pubg.png',
      prices: [
        { duration: '1 Day', price: 100.00 },
        { duration: '7 Days', price: 400.00 },
        { duration: '30 Days', price: 1200.00 }
      ],
      isActive: true,
    },
    {
      name: '8 Ball Pool',
      description: 'Premium coin codes and legendary cue keys.',
      image: '/images/8ballpool.png',
      prices: [
        { duration: '1 Day', price: 50.00 },
        { duration: '30 Days', price: 400.00 }
      ],
      isActive: true,
    },
  ];

  const seededProducts = await Product.insertMany(products);
  console.log('Products seeded successfully.');

  // Pre-stock keys matching standard time durations
  console.log('Pre-stocking license keys for the game catalog...');
  const keysToStock = [
    { key: 'MLBB-1DAY-KEY1-9999', productId: seededProducts[0]._id, duration: '1 Day', isSold: false },
    { key: 'MLBB-30DY-KEY2-8888', productId: seededProducts[0]._id, duration: '30 Days', isSold: false },
    
    { key: 'CODM-1DAY-KEYX-4444', productId: seededProducts[1]._id, duration: '1 Day', isSold: false },
    { key: 'CODM-30DY-VIPX-5555', productId: seededProducts[1]._id, duration: '30 Days', isSold: false },
    
    { key: 'PUBG-1DAY-KEYZ-7777', productId: seededProducts[2]._id, duration: '1 Day', isSold: false },
    { key: 'PUBG-30DY-KEYW-8888', productId: seededProducts[2]._id, duration: '30 Days', isSold: false },
    
    { key: 'POOL-30DY-COIN-KEY9', productId: seededProducts[3]._id, duration: '30 Days', isSold: false },
  ];
  await LicenseKey.insertMany(keysToStock);
  console.log('Demo license keys stocked successfully.');

  console.log('Database seeding process finished.');
  await mongoose.connection.close();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seeding failed with error:', err);
  process.exit(1);
});
