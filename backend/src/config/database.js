const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
        console.log('✅ PostgreSQL connected');
    }
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err.message);
    process.exit(1);
});

/**
 * Execute a query with optional parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
const query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
        console.log('📊 Query executed:', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
    const client = await pool.connect();
    const originalRelease = client.release.bind(client);
    client.release = () => {
        client.release = originalRelease;
        return client.release();
    };
    return client;
};

module.exports = { query, getClient, pool };