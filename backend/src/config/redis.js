const { createClient } = require('redis');

//Global variable to hold the Redis client instance
let redisClient;

//Function to connect to Redis and initialize the client
const connectRedis = async () => {
    redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
            keepAlive: 30000,

            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    console.error('❌ Redis: Too many reconnect attempts. Giving up.');
                    return new Error('Too many retries');
                }
                return retries * 100;
            },
        },
    });


    //Event listeners for Redis connection and errors
    redisClient.on('connect', () => console.log('Redis connected'));
    redisClient.on('error', (err) => console.error('Redis error:', err.message));
    redisClient.on('reconnecting', () => console.log('Redis reconnecting...'));

    await redisClient.connect();
    return redisClient;
};


//Function to get the Redis client instance ensuring it's initialized
const getRedisClient = () => {
    if (!redisClient) throw new Error('Redis not initialized. Call connectRedis() first.');
    return redisClient;
};

//Cache utility functions for get, set, delete and pattern delete operations
const cache = {
    async get(key) {
        try {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            console.error('Cache get error:', err.message);
            return null;
        }
    },

    async set(key, value, ttlSeconds = 300) {
        try {
            await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        } catch (err) {
            console.error('Cache set error:', err.message);
        }
    },

    async del(key) {
        try {
            await redisClient.del(key);
        } catch (err) {
            console.error('Cache del error:', err.message);
        }
    },

    async delPattern(pattern) {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) await redisClient.del(keys);
        } catch (err) {
            console.error('Cache delPattern error:', err.message);
        }
    },
};

module.exports = { connectRedis, getRedisClient, cache };