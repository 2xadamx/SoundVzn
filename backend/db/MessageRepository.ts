import { BaseRepository } from './UserRepository.js';

export interface MessageEntity {
    id?: number;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read?: number;
    created_at: number;
}

export class MessageRepository extends BaseRepository {
    private insertStmt = this.db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, content, created_at)
        VALUES (?, ?, ?, ?)
    `);

    public send(msg: MessageEntity): number {
        const result = this.insertStmt.run(msg.sender_id, msg.receiver_id, msg.content, msg.created_at);
        return result.lastInsertRowid as number;
    }

    public getConversation(userA: string, userB: string, limit: number = 50) {
        return this.db.prepare(`
            SELECT * FROM messages 
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at DESC LIMIT ?
        `).all(userA, userB, userB, userA, limit).reverse();
    }

    public markAsRead(receiverId: string, senderId: string) {
        this.db.prepare('UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?').run(receiverId, senderId);
    }

    public getUnreadCount(userId: string): number {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0').get(userId) as any;
        return result.count;
    }
}

export const messageRepository = new MessageRepository();
