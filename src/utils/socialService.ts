import { BACKEND_URL } from './apiConfig';
import { authFetch, getAuthHeaders } from './authSession';

export interface SocialUser {
    id: string;
    svzn_id: number;
    username: string;
    name: string;
    avatar?: string;
    status: 'online' | 'idle' | 'offline';
    lastActive?: number;
    activity?: {
        track?: string;
        artist?: string;
        cover?: string;
        duration?: number;
        progress?: number;
    };
    note?: {
        type: 'text' | 'audio' | 'music';
        text?: string;
        audioB64?: string;
        track?: string;
        artist?: string;
        cover?: string;
        previewUrl?: string;
        theme?: string;
        savedAt: number;
    };
    unreadCount?: number;
    is_pinned?: boolean;
    is_muted?: boolean;
    friend_status?: 'pending' | 'accepted' | 'none';
}

class SocialService {
    async togglePin(friendId: string): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/friends/${friendId}/pin`, {
                method: 'POST', headers: this.getHeaders(),
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async toggleMute(friendId: string): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/friends/${friendId}/mute`, {
                method: 'POST', headers: this.getHeaders(),
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async clearChat(friendId: string): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/messages/${friendId}/clear`, {
                method: 'DELETE', headers: this.getHeaders(),
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async blockUser(userId: string): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/users/${userId}/block`, {
                method: 'POST', headers: this.getHeaders(),
            });
            return res.ok;
        } catch (e) { return false; }
    }

    private getHeaders() {
        return getAuthHeaders({ 'Content-Type': 'application/json' });
    }

    async getFriends(): Promise<SocialUser[]> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/friends`, { headers: this.getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('[Social] getFriends failed:', e);
            return [];
        }
    }

    async sendFriendRequest(userIdOrEmail: string): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/request`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ target: userIdOrEmail })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                console.error('[Social] sendFriendRequest failed:', res.status, err);
            }
            return res.ok;
        } catch (e) {
            console.error('[Social] sendFriendRequest error:', e);
            return false;
        }
    }

    async removeFriend(id: string): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/friends/${id}`, {
                method: 'DELETE', headers: this.getHeaders(),
            });
            if (!res.ok) console.error('[Social] removeFriend failed:', res.status);
            return res.ok;
        } catch (e) {
            console.error('[Social] removeFriend error:', e);
            return false;
        }
    }

    async updateActivity(status: string, trackInfo?: any): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/status`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ status, trackInfo: trackInfo || null })
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async saveNote(noteData: any): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/notes`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(noteData)
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async deleteNote(): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/notes`, {
                method: 'DELETE', headers: this.getHeaders(),
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async getChat(friendId: string): Promise<any[]> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/messages/${friendId}`, { headers: this.getHeaders() });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) { return []; }
    }

    async sendMessage(targetId: string, type: 'text' | 'music', content: string, trackData?: any): Promise<boolean> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ targetId, type, content, trackData })
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async toggleLike(noteId: string): Promise<{ liked?: boolean; error?: boolean }> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/notes/like`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ noteId })
            });
            return await res.json();
        } catch (e) { return { error: true }; }
    }

    async getNoteInteractions(noteId: string): Promise<{ likers: any[]; replies: any[] }> {
        try {
            const res = await authFetch(`${BACKEND_URL}/api/social/notes/${noteId}/interactions`, { headers: this.getHeaders() });
            if (!res.ok) return { likers: [], replies: [] };
            return await res.json();
        } catch (e) { return { likers: [], replies: [] }; }
    }

    async replyNote(noteId: string, text: string): Promise<boolean> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/social/notes/reply`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ noteId, text })
            });
            return res.ok;
        } catch (e) { return false; }
    }

    // ─── Marketplace & Canvas Studio ───
    async getMarketplaceThemes(): Promise<any[]> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/marketplace/themes`, { headers: this.getHeaders() });
            return await res.json();
        } catch (e) { return []; }
    }

    async getUserInventory(): Promise<any[]> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/marketplace/inventory`, { headers: this.getHeaders() });
            return await res.json();
        } catch (e) { return []; }
    }

    async getUserBalance(): Promise<number> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/marketplace/balance`, { headers: this.getHeaders() });
            const data = await res.json();
            return data.balance || 0;
        } catch (e) { return 0; }
    }

    async buyTheme(themeId: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/marketplace/buy`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ themeId })
            });
            return await res.json();
        } catch (e) { return { success: false, error: 'Connection error' }; }
    }

    async publishTheme(themeData: any): Promise<{ success: boolean; themeId?: string }> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/marketplace/publish`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(themeData)
            });
            return await res.json();
        } catch (e) { return { success: false }; }
    }

    async searchUsers(query: string): Promise<SocialUser[]> {
        try {
            console.log(`[SocialService] Searching users for: "${query}"`);
            const res = await fetch(`${BACKEND_URL}/api/social/search?q=${encodeURIComponent(query)}`, { headers: this.getHeaders() });
            if (!res.ok) return [];
            const data = await res.json();
            console.log(`[SocialService] Found ${data.length} results. First result ID:`, data[0]?.id, 'svzn_id:', data[0]?.svzn_id);
            return data;
        } catch (e) {
            console.error('[SocialService] Search failed:', e);
            return [];
        }
    }

    async getRequests(): Promise<any[]> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/social/requests`, { headers: this.getHeaders() });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            return [];
        }
    }

    async respondRequest(senderId: string, accept: boolean): Promise<boolean> {
        try {
            const res = await fetch(`${BACKEND_URL}/api/social/respond`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ senderId, accept })
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    generateInviteLink(user: any): string {
        try {
            if (!user) return `${window.location.origin}/?addFriend=invite`;
            // Use the professional 6-digit numeric ID for sharing
            const paddedId = user.svzn_id ? user.svzn_id.toString().padStart(6, '0') : 'invite';
            return `${window.location.origin}/?addFriend=${paddedId}`;
        } catch (e) {
            return `${window.location.origin}/?addFriend=invite`;
        }
    }
}

export const socialService = new SocialService();
