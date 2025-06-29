const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class DataAPIServer {
    constructor(logger) {
        this.logger = logger;
        this.app = express();
        this.port = process.env.API_PORT || 3000;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Enable CORS for all origins
        this.app.use(cors({
            origin: '*',
            methods: ['GET'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        this.app.use(express.json());
        
        // Add request logging
        this.app.use((req, res, next) => {
            this.logger.info(`API Request: ${req.method} ${req.path} from ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Get all data
        this.app.get('/api/data', async (req, res) => {
            try {
                const data = await this.readDataFile();
                res.json({
                    success: true,
                    data: data,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Error serving data:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to read data file',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get specific data sections
        this.app.get('/api/data/:section', async (req, res) => {
            try {
                const { section } = req.params;
                const data = await this.readDataFile();
                
                if (!data[section]) {
                    return res.status(404).json({
                        success: false,
                        error: `Section '${section}' not found`,
                        availableSections: Object.keys(data),
                        timestamp: new Date().toISOString()
                    });
                }

                res.json({
                    success: true,
                    section: section,
                    data: data[section],
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Error serving data section:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to read data file',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get staff statistics
        this.app.get('/api/stats/staff', async (req, res) => {
            try {
                const data = await this.readDataFile();
                const staffStats = data.staffStats || {};
                
                // Transform the data for better readability
                const transformedStats = Object.entries(staffStats).map(([staffId, stats]) => ({
                    staffId,
                    totalTickets: stats.totalTickets || 0,
                    monthlyTickets: stats.monthlyTickets || 0,
                    activeTickets: stats.activeTickets ? stats.activeTickets.length : 0
                }));

                res.json({
                    success: true,
                    staffCount: transformedStats.length,
                    data: transformedStats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Error serving staff stats:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to read staff statistics',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get quota information
        this.app.get('/api/quota', async (req, res) => {
            try {
                const data = await this.readDataFile();
                const quotas = data.quotas || {};
                const quotaHistory = data.quotaHistory || {};

                res.json({
                    success: true,
                    currentQuota: quotas,
                    history: quotaHistory,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Error serving quota data:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to read quota data',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get ticket features (priorities, categories)
        this.app.get('/api/tickets/features', async (req, res) => {
            try {
                const data = await this.readDataFile();
                
                res.json({
                    success: true,
                    priorities: data.priorities || {},
                    categories: data.categories || {},
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Error serving ticket features:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to read ticket features',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get API documentation
        this.app.get('/api/docs', (req, res) => {
            const docs = {
                title: 'Discord Bot Data API',
                version: '1.0.0',
                description: 'API to access Discord bot data from other servers',
                endpoints: {
                    'GET /health': 'Health check endpoint',
                    'GET /api/data': 'Get all bot data',
                    'GET /api/data/:section': 'Get specific data section (contributions, staffStats, quotas, etc.)',
                    'GET /api/stats/staff': 'Get formatted staff statistics',
                    'GET /api/quota': 'Get quota information and history',
                    'GET /api/tickets/features': 'Get ticket priorities and categories',
                    'GET /api/docs': 'This documentation'
                },
                examples: {
                    getAllData: `${req.protocol}://${req.get('host')}/api/data`,
                    getStaffStats: `${req.protocol}://${req.get('host')}/api/stats/staff`,
                    getContributions: `${req.protocol}://${req.get('host')}/api/data/contributions`,
                    getQuotas: `${req.protocol}://${req.get('host')}/api/quota`
                }
            };

            res.json(docs);
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                availableEndpoints: [
                    '/health',
                    '/api/data',
                    '/api/data/:section',
                    '/api/stats/staff',
                    '/api/quota',
                    '/api/tickets/features',
                    '/api/docs'
                ],
                timestamp: new Date().toISOString()
            });
        });
    }

    async readDataFile() {
        try {
            const dataPath = path.resolve(__dirname, '../data.json');
            const data = await fs.readFile(dataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {}; // Return empty object if file doesn't exist
            }
            throw error;
        }
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            this.logger.info(`Data API server started on port ${this.port}`);
            this.logger.info(`API Documentation available at: http://localhost:${this.port}/api/docs`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            this.logger.info('SIGTERM received, shutting down API server gracefully');
            this.server.close(() => {
                this.logger.info('API server closed');
            });
        });

        return this.server;
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.logger.info('API server stopped');
        }
    }
}

module.exports = { DataAPIServer };