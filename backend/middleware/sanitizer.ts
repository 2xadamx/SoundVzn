import { Request, Response, NextFunction } from 'express';
import { Sanitizer } from '../utils/sanitizer.js';

/**
 * Enterprise Request Sanitizer Middleware
 * Recursively cleans all strings in req.body
 */
export const requestSanitizer = (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    next();
};

function sanitizeObject(obj: any) {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = Sanitizer.clean(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}
