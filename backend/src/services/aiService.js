const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
    baseURL: AI_SERVICE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Classify a complaint using AI
 * @param {string} description - Complaint description
 * @returns {{ category: string, priority: string, summary: string }}
 */
const classifyComplaint = async (description) => {
    try {
        const response = await aiClient.post('/ai/classify-complaint', { description });
        return response.data.data;
    } catch (err) {
        console.error('AI classification error:', err.message);
        // Return defaults if AI service is unavailable
        return {
            category: 'Other',
            priority: 'medium',
            summary: description.substring(0, 100),
        };
    }
};

/**
 * Send a message to the AI chatbot
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages
 * @param {Object} context - User/society context
 */
const chatWithAssistant = async (message, conversationHistory = [], context = {}) => {
    const response = await aiClient.post('/ai/chat', {
        message,
        conversation_history: conversationHistory,
        context,
    });
    return response.data.data;
};

/**
 * Generate dashboard insights
 * @param {Object} data - Analytics data
 */
const generateInsights = async (data) => {
    try {
        const response = await aiClient.post('/ai/insights', { data });
        return response.data.data;
    } catch (err) {
        console.error('AI insights error:', err.message);
        return { insights: [] };
    }
};

//Check AI service health
const checkAIHealth = async () => {
    try {
        const response = await aiClient.get('/health');
        return response.data.data;
    } catch {
        return { status: 'unavailable' };
    }
};

module.exports = { classifyComplaint, chatWithAssistant, generateInsights, checkAIHealth };