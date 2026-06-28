const { Pool } = require('pg');

//Create a new pool instance with configuration from environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

//Event listeners for pool connection and errors
pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
        console.log('PostgreSQL connected');
    }
});

pool.on('error', (err) => {
    console.error('PostgreSQL connection error:', err.message);
    process.exit(1);
});

/**
 * Execute a query with optional parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */

//In development mode, log the query and its execution time
const query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
        console.log('Query executed:', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
};

//Get a client from the pool for transactions or multiple queries
const getClient = async () => {
    const client = await pool.connect();
    const originalRelease = client.release.bind(client);
    client.release = () => {
        client.release = originalRelease;
        return client.release();
    };
    return client;
};

pool.query('SELECT NOW()')
    .then(() => console.log('PostgreSQL Connected'))
    .catch(err => console.error('PostgreSQL Error:', err.message));

module.exports = { query, getClient, pool };