const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class TicketFeatures {
    constructor(logger) {
        this.logger = logger;
        this.priorities = new Map();
        this.categories = new Map();
        this.dataPath = config.paths.data;
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const parsed = JSON.parse(data);
            
            // Load feature data from the existing data.json
            this.priorities = new Map(Object.entries(parsed.priorities || {}));
            this.categories = new Map(Object.entries(parsed.categories || {}));
            
            this.logger.info('Ticket features data loaded successfully');
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.logger.info('No data file found. Starting fresh.');
                await this.saveData();
            } else {
                this.logger.error('Error loading data:', error);
                throw error;
            }
        }
    }

    async saveData() {
        try {
            // Read existing data first
            let existingData = {};
            try {
                const data = await fs.readFile(this.dataPath, 'utf8');
                existingData = JSON.parse(data);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // Merge with existing data
            const newData = {
                ...existingData,
                priorities: Object.fromEntries(this.priorities),
                categories: Object.fromEntries(this.categories)
            };
            
            await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
            await fs.writeFile(this.dataPath, JSON.stringify(newData, null, 2), 'utf8');
            
            this.logger.info('Data saved successfully');
        } catch (error) {
            this.logger.error('Error saving data:', error);
            throw error;
        }
    }

    // Priority Methods
    async setPriority(channelId, priorityData) {
        this.priorities.set(channelId, {
            level: priorityData.level,
            reason: priorityData.reason,
            setBy: priorityData.setBy,
            setAt: priorityData.setAt.toISOString()
        });
        await this.saveData();
    }

    getPriority(channelId) {
        return this.priorities.get(channelId);
    }

    // Category Methods
    async setCategory(channelId, categoryData) {
        this.categories.set(channelId, {
            type: categoryData.type,
            setBy: categoryData.setBy,
            setAt: categoryData.setAt.toISOString()
        });
        await this.saveData();
    }

    getCategory(channelId) {
        return this.categories.get(channelId);
    }

    // Cleanup Methods
    async cleanupTicket(channelId) {
        this.priorities.delete(channelId);
        this.categories.delete(channelId);
        await this.saveData();
    }

    // Statistics Methods
    getStatistics() {
        return {
            priorities: {
                urgent: Array.from(this.priorities.values()).filter(p => p.level === 'urgent').length,
                high: Array.from(this.priorities.values()).filter(p => p.level === 'high').length,
                normal: Array.from(this.priorities.values()).filter(p => p.level === 'normal').length,
                low: Array.from(this.priorities.values()).filter(p => p.level === 'low').length
            },
            categories: {
                server: Array.from(this.categories.values()).filter(c => c.type === 'server').length,
                coins: Array.from(this.categories.values()).filter(c => c.type === 'coins').length,
                plugins: Array.from(this.categories.values()).filter(c => c.type === 'plugins').length,
                performance: Array.from(this.categories.values()).filter(c => c.type === 'performance').length,
                other: Array.from(this.categories.values()).filter(c => c.type === 'other').length
            }
        };
    }
}

async function initializeTicketFeatures(logger) {
    const features = new TicketFeatures(logger);
    await features.loadData();
    return features;
}

module.exports = {
    TicketFeatures,
    initializeTicketFeatures
}; 