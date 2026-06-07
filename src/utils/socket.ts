import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './apiConfig';

/**
 * Enterprise Socket Manager
 * Handles real-time synchronization with SoundVzn Core.
 */
class SocketManager {
    private socket: Socket | null = null;

    public connect() {
        if (this.socket?.connected) return;

        const token = localStorage.getItem('svzn_token');
        if (!token) return;

        this.socket = io(BACKEND_URL, {
            auth: { token },
            transports: ['websocket'], // Force WebSocket for performance
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.setupHandlers();
    }

    private setupHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.info('[Socket] Connected to SoundVzn Core');
        });

        this.socket.on('chat:receive', (data) => {
            window.dispatchEvent(new CustomEvent('svzn:chat_receive', { detail: data }));
        });

        this.socket.on('chat:typing', (data) => {
            window.dispatchEvent(new CustomEvent('svzn:chat_typing', { detail: data }));
        });

        this.socket.on('social:activity', (data) => {
            // Dispatch to global state (Zustand)
            // This would update the FriendsView in real-time
            window.dispatchEvent(new CustomEvent('svzn:social_update', { detail: data }));
        });

        this.socket.on('disconnect', () => {
            console.warn('[Socket] Disconnected from core');
        });
    }

    public sendChat(receiverId: string, content: string) {
        if (!this.socket?.connected) return;
        this.socket.emit('chat:send', { receiver_id: receiverId, content });
    }

    public updateActivity(track: any) {
        if (!this.socket?.connected) return;
        this.socket.emit('activity:update', {
            track: track?.title,
            artist: track?.artist,
            cover: track?.cover
        });
    }

    public disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
}

export const socketManager = new SocketManager();
