import { useNotificationsStore } from '@store/notifications';
import { NotificationType } from '@store/notifications';
import { translate } from '@utils/i18n';

function pushNotification(
  type: NotificationType,
  titleKey: Parameters<typeof translate>[0],
  bodyKey: Parameters<typeof translate>[0],
  params?: Record<string, string | number>
) {
  const { addNotification } = useNotificationsStore.getState();
  const title = translate(titleKey, undefined, params);
  const body = translate(bodyKey, undefined, params);
  addNotification(title, body, type);
}

export const notificationService = {
  achievementFirstPlay() {
    pushNotification(
      'achievement',
      'notifications.achievements.firstPlay.title',
      'notifications.achievements.firstPlay.body'
    );
  },

  favoriteChanged(trackTitle: string, added: boolean) {
    pushNotification(
      'star',
      added
        ? 'notifications.favorites.added.title'
        : 'notifications.favorites.removed.title',
      added
        ? 'notifications.favorites.added.body'
        : 'notifications.favorites.removed.body',
      { track: trackTitle }
    );
  },

  offlineToggled(enabled: boolean) {
    pushNotification(
      'system',
      enabled
        ? 'notifications.system.offlineEnabled.title'
        : 'notifications.system.offlineDisabled.title',
      enabled
        ? 'notifications.system.offlineEnabled.body'
        : 'notifications.system.offlineDisabled.body'
    );
  },

  downloadStarted(trackTitle: string) {
    pushNotification(
      'download',
      'notifications.download.started.title',
      'notifications.download.started.body',
      { track: trackTitle }
    );
  },

  downloadCompleted(trackTitle: string) {
    pushNotification(
      'download',
      'notifications.download.completed.title',
      'notifications.download.completed.body',
      { track: trackTitle }
    );
  },

  downloadFailed(trackTitle: string) {
    pushNotification(
      'alert',
      'notifications.download.failed.title',
      'notifications.download.failed.body',
      { track: trackTitle }
    );
  },
};
