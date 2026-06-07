import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { authController } from '../authController.js';
import { activityRepository } from '../db/ActivityRepository.js';
import { messageRepository } from '../db/MessageRepository.js';
import { Logger } from '../utils/logger.js';
import { db } from '../db/index.js';
import { Sanitizer } from '../utils/sanitizer.js';

export class SocketService {
    private io: Server;
    private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

    constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: (origin, callback) => {
                    // Allow all localhost in dev, and FRONTEND_URL in production
                    if (!origin) return callback(null, true);
                    if (origin.includes('localhost')) return callback(null, true);
                    const allowed = process.env.FRONTEND_URL || process.env.PRODUCTION_URL;
                    if (allowed && origin === allowed) return callback(null, true);
                    callback(new Error('Not allowed by CORS'));
                },
                credentials: true
            }
        });

        this.setupMiddleware();
        this.setupHandlers();
    }

    private setupMiddleware() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) return next(new Error('AUTHENTICATION_ERROR'));

            const payload: any = authController.verifyAccessToken(token);
            if (!payload) return next(new Error('INVALID_TOKEN'));

            (socket as any).userId = payload.id;
            next();
        });
    }

    private setupHandlers() {
        this.io.on('connection', (socket: Socket) => {
            const userId = (socket as any).userId;
            Logger.info(`[Socket] User connected: ${userId} (${socket.id})`);

            // Register socket
            const sockets = this.userSockets.get(userId) || [];
            this.userSockets.set(userId, [...sockets, socket.id]);

            // Broadcast "Online" status
            this.broadcastPresence(userId, 'online');

            // ── Activity Handlers ──
            socket.on('activity:update', (data) => {
                activityRepository.update({
                    user_id: userId,
                    status: 'online',
                    track: data?.track ? Sanitizer.clean(data.track).substring(0, 200) : undefined,
                    artist: data?.artist ? Sanitizer.clean(data.artist).substring(0, 200) : undefined,
                    cover: data?.cover || undefined,
                    updated_at: Date.now()
                });
                this.io.emit('social:activity', {
                    userId,
                    track: data?.track ? Sanitizer.clean(data.track).substring(0, 200) : undefined,
                    artist: data?.artist ? Sanitizer.clean(data.artist).substring(0, 200) : undefined,
                    cover: data?.cover || undefined
                });
            });

            // ── Chat Handlers ──
            socket.on('chat:send', (data) => {
                const receiverId = typeof data?.receiver_id === 'string' ? data.receiver_id : '';
                const content = typeof data?.content === 'string' ? Sanitizer.clean(data.content).substring(0, 2000) : '';
                const relation = db.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = "accepted"')
                    .get(userId, receiverId);
                if (!relation || !content) {
                    socket.emit('chat:error', { error: 'MESSAGE_NOT_ALLOWED' });
                    return;
                }

                const msgId = messageRepository.send({
                    sender_id: userId,
                    receiver_id: receiverId,
                    content,
                    created_at: Date.now()
                });

                const msgPayload = { id: msgId, sender_id: userId, receiver_id: receiverId, content, created_at: Date.now() };

                // Emit to receiver
                const receiverSockets = this.userSockets.get(receiverId) || [];
                receiverSockets.forEach(sid => this.io.to(sid).emit('chat:receive', msgPayload));
                
                // Sync back to sender
                socket.emit('chat:sent', msgPayload);
            });

            socket.on('chat:typing', (data) => {
                const receiverId = typeof data?.receiver_id === 'string' ? data.receiver_id : '';
                const relation = db.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = "accepted"')
                    .get(userId, receiverId);
                if (!relation) return;
                const receiverSockets = this.userSockets.get(receiverId) || [];
                receiverSockets.forEach(sid => this.io.to(sid).emit('chat:typing', { sender_id: userId, is_typing: !!data.is_typing }));
            });

            socket.on('disconnect', () => {
                const updatedSockets = (this.userSockets.get(userId) || []).filter(id => id !== socket.id);
                if (updatedSockets.length === 0) {
                    this.userSockets.delete(userId);
                    this.broadcastPresence(userId, 'offline');
                } else {
                    this.userSockets.set(userId, updatedSockets);
                }
                Logger.info(`[Socket] User disconnected: ${userId}`);
            });
        });
    }

    private broadcastPresence(userId: string, status: string) {
        this.io.emit('presence:update', { userId, status });
    }
}
