import { db } from './index.js';

export abstract class BaseRepository {
    protected db = db;
}

export interface UserEntity {
    svzn_id?: number;
    id: string;
    email: string;
    password_hash: string;
    name: string;
    username?: string;
    tier: string;
    verified: number;
    avatar?: string;
    bio?: string;
    anthem?: string;
    created_at: number;
    security_score?: number;
}

export class UserRepository extends BaseRepository {
    private findByIdStmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    private findByEmailStmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    private findByUsernameStmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    
    public findById(id: string): UserEntity | null {
        return this.findByIdStmt.get(id) as UserEntity | null;
    }

    public findByEmail(email: string): UserEntity | null {
        return this.findByEmailStmt.get(email) as UserEntity | null;
    }

    public findByUsername(username: string): UserEntity | null {
        return this.findByUsernameStmt.get(username) as UserEntity | null;
    }

    public create(user: UserEntity): boolean {
        const stmt = this.db.prepare(`
            INSERT INTO users (id, email, password_hash, name, username, tier, verified, created_at)
            VALUES (@id, @email, @password_hash, @name, @username, @tier, @verified, @created_at)
        `);
        const result = stmt.run(user);
        return result.changes > 0;
    }

    public updateSecurityScore(id: string, score: number): void {
        this.db.prepare('UPDATE users SET security_score = ? WHERE id = ?').run(score, id);
    }
}

export const userRepository = new UserRepository();
