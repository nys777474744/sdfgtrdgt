class InviteTracker {
    constructor() {
        this.invites = new Map();
        this.memberData = new Map();
    }

    async init(guild) {
        try {
            const invites = await guild.invites.fetch();
            for (const [code, invite] of invites) {
                this.invites.set(code, {
                    code: invite.code,
                    uses: invite.uses,
                    inviterId: invite.inviterId,
                    createdTimestamp: invite.createdTimestamp
                });
            }

            // Initialize with audit log data
            const auditLogs = await guild.fetchAuditLogs({
                type: 28, // MEMBER_DISCONNECT for leaves
                limit: 100
            }).catch(() => null);

            if (auditLogs) {
                for (const entry of auditLogs.entries.values()) {
                    const memberId = entry.target.id;
                    if (!this.memberData.has(memberId)) {
                        this.memberData.set(memberId, {
                            leftAt: entry.createdTimestamp
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error initializing invite tracker:', error);
        }
    }

    async trackJoin(member) {
        try {
            const newInvites = await member.guild.invites.fetch();
            const usedInvite = this.findUsedInvite(newInvites);

            if (usedInvite) {
                // Update invite tracking
                this.invites = new Map(newInvites.map(invite => [
                    invite.code,
                    {
                        code: invite.code,
                        uses: invite.uses,
                        inviterId: invite.inviterId,
                        createdTimestamp: invite.createdTimestamp
                    }
                ]));

                // Get invite audit log for this join
                const inviteLog = await member.guild.fetchAuditLogs({
                    type: 27, // MEMBER_ADD
                    limit: 10
                }).catch(() => null);

                let inviteEntry = null;
                if (inviteLog) {
                    inviteEntry = inviteLog.entries.find(entry => 
                        entry.target.id === member.id &&
                        entry.changes?.some(change => 
                            change.key === 'code' && 
                            change.new === usedInvite.code
                        )
                    );
                }

                // Store member data with audit log information
                this.memberData.set(member.id, {
                    joinedAt: member.joinedTimestamp,
                    inviteCode: usedInvite.code,
                    inviterId: usedInvite.inviterId,
                    createdAt: member.user.createdTimestamp,
                    auditLogId: inviteEntry?.id
                });

                return {
                    code: usedInvite.code,
                    inviter: usedInvite.inviterId,
                    isFake: this.isFakeInvite(member)
                };
            }
        } catch (error) {
            console.error('Error tracking join:', error);
        }
        return null;
    }

    findUsedInvite(newInvites) {
        for (const [code, invite] of newInvites) {
            const oldInvite = this.invites.get(code);
            if (oldInvite && invite.uses > oldInvite.uses) {
                return invite;
            }
        }
        return null;
    }

    isFakeInvite(member) {
        // Account less than 7 days old
        const accountAge = Date.now() - member.user.createdTimestamp;
        if (accountAge < 7 * 24 * 60 * 60 * 1000) {
            return true;
        }

        // Account created and joined within 1 hour
        if (member.joinedTimestamp - member.user.createdTimestamp < 60 * 60 * 1000) {
            return true;
        }

        // Check if member left within 24 hours of joining
        const memberData = this.memberData.get(member.id);
        if (memberData?.leftAt && memberData.joinedAt) {
            const joinToLeaveTime = memberData.leftAt - memberData.joinedAt;
            if (joinToLeaveTime < 24 * 60 * 60 * 1000) {
                return true;
            }
        }

        return false;
    }

    async getInviterStats(guild, inviterId) {
        try {
            // Get current invites
            const invites = await guild.invites.fetch();
            const userInvites = invites.filter(invite => invite.inviterId === inviterId);
            
            // Get relevant audit logs
            const [inviteAuditLogs, leaveAuditLogs] = await Promise.all([
                guild.fetchAuditLogs({
                    type: 27, // MEMBER_ADD
                    limit: 100
                }).catch(() => null),
                guild.fetchAuditLogs({
                    type: 28, // MEMBER_DISCONNECT
                    limit: 100
                }).catch(() => null)
            ]);

            let regularInvites = 0;
            let leftMembers = 0;
            let fakeInvites = 0;

            // Process current invites
            for (const invite of userInvites.values()) {
                regularInvites += invite.uses;
            }

            // Get all members who were invited by this user
            const invitedMembers = Array.from(this.memberData.entries())
                .filter(([_, data]) => data.inviterId === inviterId);

            for (const [memberId, data] of invitedMembers) {
                const member = await guild.members.fetch(memberId).catch(() => null);
                
                // Check if member has left using audit logs
                const hasLeft = !member || leaveAuditLogs?.entries.some(entry => 
                    entry.target.id === memberId
                );

                if (hasLeft) {
                    leftMembers++;
                    
                    // Check if they left within 24 hours
                    const leaveEntry = leaveAuditLogs?.entries.find(entry => 
                        entry.target.id === memberId
                    );
                    
                    if (leaveEntry && data.joinedAt) {
                        const joinToLeaveTime = leaveEntry.createdTimestamp - data.joinedAt;
                        if (joinToLeaveTime < 24 * 60 * 60 * 1000) {
                            fakeInvites++;
                        }
                    }
                } else if (this.isFakeInvite(member)) {
                    fakeInvites++;
                }
            }

            // Calculate total effective invites
            const totalEffectiveInvites = Math.max(0, regularInvites - leftMembers - fakeInvites);

            return {
                total: totalEffectiveInvites,
                regular: regularInvites,
                left: leftMembers,
                fake: fakeInvites
            };
        } catch (error) {
            console.error('Error getting inviter stats:', error);
            return null;
        }
    }

    async handleMemberLeave(member) {
        try {
            // Get leave audit log
            const auditLog = await member.guild.fetchAuditLogs({
                type: 28, // MEMBER_DISCONNECT
                limit: 1
            }).catch(() => null);

            const leaveEntry = auditLog?.entries.first();
            
            const memberData = this.memberData.get(member.id);
            if (memberData) {
                memberData.leftAt = leaveEntry?.createdTimestamp || Date.now();
            } else {
                this.memberData.set(member.id, {
                    leftAt: leaveEntry?.createdTimestamp || Date.now()
                });
            }
        } catch (error) {
            console.error('Error handling member leave:', error);
        }
    }
}

const inviteTracker = new InviteTracker();

module.exports = { inviteTracker }; 