import { create } from 'zustand';

export type NotificationType = 'music' | 'download' | 'star' | 'pro' | 'info' | 'alert' | 'system' | 'achievement';

export interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    time: string;
    timestamp: number;
    unread: boolean;
}

interface NotificationsState {
    notifications: NotificationItem[];
    addNotification: (title: string, body: string, type?: NotificationType) => void;
    markAllRead: () => void;
    markAsRead: (id: string) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

const MAX_NOTIFICATIONS = 60;

export const useNotificationsStore = create<NotificationsState>((set) => ({
    notifications: [],
    addNotification: (title, body, type = 'info') => set((state) => {
        const newNotif: NotificationItem = {
            id: Date.now().toString(),
            type,
            title,
            body,
            time: 'Justo ahora',
            timestamp: Date.now(),
            unread: true
        };
        const nextNotifications = [newNotif, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
        return { notifications: nextNotifications };
    }),
    markAllRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, unread: false }))
    })),
    markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, unread: false } : n)
    })),
    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),
    clearAll: () => set({ notifications: [] })
}));
