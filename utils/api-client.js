const https = require('https');
const http = require('http');

class DataAPIClient {
    constructor(baseUrl, logger) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.logger = logger;
    }

    async makeRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${endpoint}`;
            const isHttps = url.startsWith('https://');
            const client = isHttps ? https : http;

            const req = client.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(jsonData);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async getAllData() {
        try {
            const response = await this.makeRequest('/api/data');
            return response.data;
        } catch (error) {
            this.logger.error('Error fetching all data:', error);
            throw error;
        }
    }

    async getDataSection(section) {
        try {
            const response = await this.makeRequest(`/api/data/${section}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Error fetching data section '${section}':`, error);
            throw error;
        }
    }

    async getStaffStats() {
        try {
            const response = await this.makeRequest('/api/stats/staff');
            return response.data;
        } catch (error) {
            this.logger.error('Error fetching staff stats:', error);
            throw error;
        }
    }

    async getQuotaData() {
        try {
            const response = await this.makeRequest('/api/quota');
            return {
                currentQuota: response.currentQuota,
                history: response.history
            };
        } catch (error) {
            this.logger.error('Error fetching quota data:', error);
            throw error;
        }
    }

    async getTicketFeatures() {
        try {
            const response = await this.makeRequest('/api/tickets/features');
            return {
                priorities: response.priorities,
                categories: response.categories
            };
        } catch (error) {
            this.logger.error('Error fetching ticket features:', error);
            throw error;
        }
    }

    async checkHealth() {
        try {
            const response = await this.makeRequest('/health');
            return response;
        } catch (error) {
            this.logger.error('Error checking API health:', error);
            throw error;
        }
    }
}

module.exports = { DataAPIClient };