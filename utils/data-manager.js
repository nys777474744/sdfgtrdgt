const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { EmbedBuilder } = require('discord.js');

class DataManager {
  constructor(logger) {
    this.logger = logger;
    this.contributions = new Map();
    this.staffStats = new Map();
    this.quotas = new Map();
    this.quotaHistory = new Map();
    this.priorities = new Map();
    this.notes = new Map();
    this.categories = new Map();
  }

  async loadData() {
    try {
      const data = await fs.readFile(config.paths.data, 'utf8');
      const parsed = JSON.parse(data);
      
      this.contributions = new Map(
        Object.entries(parsed.contributions || {}).map(([key, value]) => [
          key,
          new Set(value)
        ])
      );

      this.staffStats = new Map(
        Object.entries(parsed.staffStats || {}).map(([key, value]) => [
          key,
          {
            totalTickets: value.totalTickets || 0,
            activeTickets: new Set(value.activeTickets || []),
            monthlyTickets: value.monthlyTickets || 0
          }
        ])
      );

      this.quotas = new Map(Object.entries(parsed.quotas || {}));
      this.quotaHistory = new Map(Object.entries(parsed.quotaHistory || {}));
      
      // Load new feature data
      this.priorities = new Map(Object.entries(parsed.priorities || {}));
      this.notes = new Map(Object.entries(parsed.notes || {}));
      this.categories = new Map(Object.entries(parsed.categories || {}));
      
      this.logger.info('Data loaded successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.info('No existing data file found. Starting fresh.');
        await this.saveData();
      } else {
        this.logger.error('Error loading data:', error);
        throw error;
      }
    }
  }

  async getRawData() {
    try {
      const data = await fs.readFile(config.paths.data, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Error reading raw data:', error);
      return {};
    }
  }

  async saveData() {
    try {
      const data = {
        contributions: Object.fromEntries(
          Array.from(this.contributions.entries()).map(([key, value]) => [
            key,
            Array.from(value)
          ])
        ),
        staffStats: Object.fromEntries(
          Array.from(this.staffStats.entries()).map(([key, value]) => [
            key,
            {
              totalTickets: value.totalTickets,
              activeTickets: Array.from(value.activeTickets),
              monthlyTickets: value.monthlyTickets || 0
            }
          ])
        ),
        quotas: Object.fromEntries(this.quotas),
        quotaHistory: Object.fromEntries(this.quotaHistory),
        // Save new feature data
        priorities: Object.fromEntries(this.priorities),
        notes: Object.fromEntries(this.notes),
        categories: Object.fromEntries(this.categories)
      };
      
      await fs.mkdir(path.dirname(config.paths.data), { recursive: true });
      await fs.writeFile(
        config.paths.data,
        JSON.stringify(data, null, 2),
        'utf8'
      );
      
      this.logger.info('Data saved successfully');
    } catch (error) {
      this.logger.error('Error saving data:', error);
      throw error;
    }
  }

  addContribution(threadId, staffId) {
    const contributors = this.contributions.get(threadId) || new Set();
    contributors.add(staffId);
    this.contributions.set(threadId, contributors);
    this.updateStaffStats(staffId, threadId);
    return this.saveData();
  }

  updateStaffStats(staffId, threadId) {
    let stats = this.staffStats.get(staffId);
    if (!stats) {
      stats = {
        totalTickets: 0,
        activeTickets: new Set(),
        monthlyTickets: 0
      };
    }
    stats.activeTickets.add(threadId);
    this.staffStats.set(staffId, stats);
  }

  async setQuota(amount, guild) {
    const startDate = new Date().toISOString();
    this.quotas.set('monthlyQuota', amount);
    this.quotas.set('startDate', startDate);
    
    await this.sendQuotaAnnouncement(guild, 'New Quota Period Started', 
      `A new quota period has started!\n\nQuota Target: ${amount} tickets\nStart Date: ${new Date(startDate).toLocaleDateString()}`
    );
    
    return this.saveData();
  }

  async endQuota(guild) {
    const currentQuota = this.quotas.get('monthlyQuota');
    const startDate = this.quotas.get('startDate');
    const endDate = new Date().toISOString();
    
    if (!currentQuota) {
      return false;
    }

    const quotaPeriodId = `quota_${startDate}`;
    const quotaResults = {
      quota: currentQuota,
      startDate,
      endDate,
      staffResults: {}
    };

    const staffMembers = await guild.members.fetch();
    const staffList = staffMembers.filter(member => 
      member.roles.cache.has(config.bot.staffRoleId)
    );

    let resultsDescription = `**Quota Period Results**\nPeriod: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}\nQuota Target: ${currentQuota} tickets\n\n`;

    for (const [_, member] of staffList) {
      const stats = this.staffStats.get(member.id) || { monthlyTickets: 0 };
      const percentage = ((stats.monthlyTickets || 0) / currentQuota) * 100;
      
      quotaResults.staffResults[member.id] = {
        monthlyTickets: stats.monthlyTickets || 0,
        percentageAchieved: percentage
      };

      resultsDescription += `${member.user.username}: ${stats.monthlyTickets || 0}/${currentQuota} (${percentage.toFixed(1)}%)\n`;
    }

    this.quotaHistory.set(quotaPeriodId, quotaResults);
    this.quotas.delete('monthlyQuota');
    this.quotas.delete('startDate');

    await this.sendQuotaAnnouncement(guild, 'Quota Period Ended', resultsDescription);

    await this.saveData();
    return true;
  }

  async sendQuotaAnnouncement(guild, title, description) {
    try {
      const channel = await guild.channels.fetch(config.bot.announcementChannelId);
      if (!channel) {
        this.logger.error('Announcement channel not found');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

      await channel.send({
        content: `<@&${config.bot.staffRoleId}>`,
        embeds: [embed]
      });
    } catch (error) {
      this.logger.error('Error sending quota announcement:', error);
    }
  }

  resetMonthlyStats() {
    for (const [staffId, stats] of this.staffStats) {
      stats.monthlyTickets = 0;
      this.staffStats.set(staffId, stats);
    }
    return this.saveData();
  }

  async closeTicket(threadId, selectedStaffIds) {
    selectedStaffIds.forEach(staffId => {
      let stats = this.staffStats.get(staffId);
      if (!stats) {
        stats = {
          totalTickets: 0,
          activeTickets: new Set(),
          monthlyTickets: 0
        };
      }
      stats.totalTickets += 1;
      stats.monthlyTickets = (stats.monthlyTickets || 0) + 1;
      stats.activeTickets.delete(threadId);
      this.staffStats.set(staffId, stats);
    });
    
    this.contributions.delete(threadId);

    // Clean up new feature data
    this.priorities.delete(threadId);
    this.notes.delete(threadId);
    this.categories.delete(threadId);
    
    await this.saveData();
  }

  // Priority methods
  async setPriority(channelId, priorityData) {
    this.priorities.set(channelId, {
      level: priorityData.level,
      reason: priorityData.reason,
      setBy: priorityData.setBy,
      setAt: priorityData.setAt.toISOString()
    });
    await this.saveData();
  }

  async getPriority(channelId) {
    return this.priorities.get(channelId);
  }

  // Notes methods
  async addNote(channelId, noteData) {
    const ticketNotes = this.notes.get(channelId) || [];
    ticketNotes.push({
      message: noteData.message,
      authorId: noteData.author,
      authorTag: noteData.authorTag,
      createdAt: noteData.timestamp.toISOString()
    });
    this.notes.set(channelId, ticketNotes);
    await this.saveData();
  }

  async getNotes(channelId) {
    return this.notes.get(channelId) || [];
  }

  // Category methods
  async setCategory(channelId, categoryData) {
    this.categories.set(channelId, {
      type: categoryData.type,
      setBy: categoryData.setBy,
      setAt: categoryData.setAt.toISOString()
    });
    await this.saveData();
  }

  async getCategory(channelId) {
    return this.categories.get(channelId);
  }
}

async function initializeDataManager(logger) {
  const dataManager = new DataManager(logger);
  await dataManager.loadData();
  return dataManager;
}

module.exports = { 
  DataManager,
  initializeDataManager
};