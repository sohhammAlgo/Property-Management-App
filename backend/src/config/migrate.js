require('dotenv').config();
const { query, pool } = require('./database');

const migrations = [
    // Enable UUID extension
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

    // Tenants table (societies)
    `CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_expires_at TIMESTAMP,
    max_residents INTEGER DEFAULT 100,
    settings JSONB DEFAULT '{}',
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Users table
    `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'resident',
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    flat_number VARCHAR(50),
    block VARCHAR(50),
    floor INTEGER,
    profile_pic_url TEXT,
    fcm_token TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Refresh tokens table
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

    // Complaints table
    `CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    image_url TEXT,
    image_public_id TEXT,
    ai_classification JSONB,
    resolution_note TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Complaint comments
    `CREATE TABLE IF NOT EXISTS complaint_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

    // Amenities table
    `CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 1,
    price_per_slot NUMERIC(10,2) DEFAULT 0,
    slot_duration_minutes INTEGER DEFAULT 60,
    available_from TIME DEFAULT '06:00',
    available_until TIME DEFAULT '22:00',
    available_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Bookings table
    `CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    amount NUMERIC(10,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Payments table
    `CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    payment_type VARCHAR(100) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending',
    gateway VARCHAR(50),
    gateway_order_id VARCHAR(255),
    gateway_payment_id VARCHAR(255),
    gateway_signature VARCHAR(500),
    receipt_url TEXT,
    month INTEGER,
    year INTEGER,
    due_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Announcements table
    `CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(50) DEFAULT 'normal',
    target_roles VARCHAR(50)[] DEFAULT '{resident}',
    is_pinned BOOLEAN DEFAULT false,
    expires_at TIMESTAMP,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,

    // Platform subscriptions
    `CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    status VARCHAR(50) DEFAULT 'active',
    starts_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    gateway_subscription_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,

    // Indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);`,
    `CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);`,
    `CREATE INDEX IF NOT EXISTS idx_complaints_tenant_id ON complaints(tenant_id);`,
    `CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);`,
    `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`,

    // Updated_at trigger function
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';`,

    // Apply updated_at triggers
    ...['tenants', 'users', 'complaints', 'amenities', 'bookings', 'payments', 'announcements', 'subscriptions'].map(
        (table) => `
    DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
    CREATE TRIGGER update_${table}_updated_at
      BEFORE UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
    ),
];

const runMigrations = async () => {
    console.log('🚀 Running database migrations...');
    try {
        for (let i = 0; i < migrations.length; i++) {
            await query(migrations[i]);
            console.log(`✅ Migration ${i + 1}/${migrations.length} completed`);
        }
        console.log('✅ All migrations completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
};

runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
});