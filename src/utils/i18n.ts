export type Language = 'es' | 'en' | 'fr' | 'de';

export type TranslationKey =
  | 'nav.home'
  | 'nav.browse'
  | 'nav.radio'
  | 'nav.playlists'
  | 'nav.library'
  | 'nav.albums'
  | 'nav.artists'
  | 'nav.stats'
  | 'nav.liveRooms'
  | 'nav.settings'
  | 'nav.section.collection'
  | 'header.searchPlaceholder'
  | 'notifications.title'
  | 'notifications.markAllRead'
  | 'notifications.clearAll'
  | 'notifications.none'
  | 'notifications.history'
  | 'notifications.justNow'
  | 'notifications.minutesAgo'
  | 'notifications.hoursAgo'
  | 'notifications.daysAgo'
  | 'profile.activity'
  | 'profile.menu.myProfile'
  | 'profile.menu.favorites'
  | 'profile.menu.playlists'
  | 'profile.menu.settings'
  | 'profile.menu.logout'
  | 'profile.stats.songs'
  | 'profile.stats.favorites'
  | 'profile.stats.hours'
  | 'devices.title'
  | 'devices.empty'
  | 'friends.title'
  | 'friends.empty'
  | 'notifications.system.offlineEnabled.title'
  | 'notifications.system.offlineEnabled.body'
  | 'notifications.system.offlineDisabled.title'
  | 'notifications.system.offlineDisabled.body'
  | 'notifications.achievements.firstPlay.title'
  | 'notifications.achievements.firstPlay.body'
  | 'notifications.download.started.title'
  | 'notifications.download.started.body'
  | 'notifications.download.completed.title'
  | 'notifications.download.completed.body'
  | 'notifications.download.failed.title'
  | 'notifications.download.failed.body'
  | 'notifications.favorites.added.title'
  | 'notifications.favorites.added.body'
  | 'notifications.favorites.removed.title'
  | 'notifications.favorites.removed.body'
  | 'notifications.system.discoveryEnabled.title'
  | 'notifications.system.discoveryEnabled.body'
  | 'notifications.system.discoveryDisabled.title'
  | 'notifications.system.discoveryDisabled.body'
  | 'notifications.moodLock.enabled.title'
  | 'notifications.moodLock.enabled.body'
  | 'notifications.moodLock.disabled.title'
  | 'notifications.moodLock.disabled.body';

const translations: Record<Language, Record<TranslationKey, string>> = {
  es: {
    'nav.home': 'Inicio',
    'nav.browse': 'Explorar',
    'nav.radio': 'Live Radio',
    'nav.playlists': 'Playlists',
    'nav.library': 'Tu Música',
    'nav.albums': 'Discos',
    'nav.artists': 'Artistas',
    'nav.stats': 'Estadísticas',
    'nav.liveRooms': 'Sesiones en Vivo',
    'nav.settings': 'Configuración',
    'nav.section.collection': 'Colección',
    'header.searchPlaceholder': 'Buscar artistas, canciones, álbumes...',
    'notifications.title': 'Notificaciones',
    'notifications.markAllRead': 'Marcar todas como leídas',
    'notifications.clearAll': 'Limpiar todo',
    'notifications.none': 'No tienes notificaciones',
    'notifications.history': 'Ver historial completo',
    'notifications.justNow': 'Justo ahora',
    'notifications.minutesAgo': 'Hace {value} min',
    'notifications.hoursAgo': 'Hace {value} h',
    'notifications.daysAgo': 'Hace {value} d',
    'profile.activity': 'Actividad de Amigos',
    'profile.menu.myProfile': 'Mi Perfil',
    'profile.menu.favorites': 'Favoritos',
    'profile.menu.playlists': 'Mis Playlists',
    'profile.menu.settings': 'Configuración',
    'profile.menu.logout': 'Cerrar Sesión',
    'profile.stats.songs': 'Canciones',
    'profile.stats.favorites': 'Favoritos',
    'profile.stats.hours': 'Horas',
    'devices.title': 'Dispositivos Inteligentes',
    'devices.empty': 'No hay otros dispositivos en tu red local.',
    'friends.title': 'Actividad de Amigos',
    'friends.empty': 'Abre SoundVizion en tu TV o Móvil para continuar la reproducción.',
    'notifications.system.offlineEnabled.title': 'Modo Offline activado',
    'notifications.system.offlineEnabled.body': 'Se bloqueó todo el tráfico hasta que lo desactives.',
    'notifications.system.offlineDisabled.title': 'Modo Offline desactivado',
    'notifications.system.offlineDisabled.body': 'La conexión volvió y las peticiones vuelven a funcionar.',
    'notifications.achievements.firstPlay.title': 'Logro desbloqueado',
    'notifications.achievements.firstPlay.body': 'Has reproducido tu primera canción en SoundVizion.',
    'notifications.download.started.title': 'Descarga iniciada',
    'notifications.download.started.body': 'Se está descargando {track} para escucharlo sin conexión.',
    'notifications.download.completed.title': 'Descarga completada',
    'notifications.download.completed.body': '{track} ya está disponible en Descargas.',
    'notifications.download.failed.title': 'Descarga fallida',
    'notifications.download.failed.body': 'No se pudo bajar {track}. Revisa tu conexión.',
    'notifications.favorites.added.title': 'Favorito guardado',
    'notifications.favorites.added.body': '{track} se agregó a tus favoritos.',
    'notifications.favorites.removed.title': 'Favorito eliminado',
    'notifications.favorites.removed.body': '{track} ya no está en Favoritos.',
    'notifications.system.discoveryEnabled.title': 'Modo Descubrimiento activo',
    'notifications.system.discoveryEnabled.body': 'Se añadirán canciones similares a la cola automáticamente.',
    'notifications.system.discoveryDisabled.title': 'Modo Descubrimiento apagado',
    'notifications.system.discoveryDisabled.body': 'La cola se detendrá al finalizar las canciones actuales.',
    'notifications.moodLock.enabled.title': 'Fijación de estado activada',
    'notifications.moodLock.enabled.body': 'Se ha bloqueado la cola en el estado de ánimo: {mood}.',
    'notifications.moodLock.disabled.title': 'Fijación de estado desactivada',
    'notifications.moodLock.disabled.body': 'La cola volverá a responder dinámicamente.',
  },
  en: {
    'nav.home': 'Home',
    'nav.browse': 'Explore',
    'nav.radio': 'Live Radio',
    'nav.playlists': 'Playlists',
    'nav.library': 'Your Music',
    'nav.albums': 'Albums',
    'nav.artists': 'Artists',
    'nav.stats': 'Your Stats',
    'nav.liveRooms': 'Live Rooms',
    'nav.settings': 'Settings',
    'nav.section.collection': 'Collection',
    'header.searchPlaceholder': 'Search artists, songs, albums...',
    'notifications.title': 'Notifications',
    'notifications.markAllRead': 'Mark all read',
    'notifications.clearAll': 'Clear all',
    'notifications.none': 'No notifications yet',
    'notifications.history': 'View full history',
    'notifications.justNow': 'Just now',
    'notifications.minutesAgo': '{value} min ago',
    'notifications.hoursAgo': '{value} h ago',
    'notifications.daysAgo': '{value} d ago',
    'profile.activity': 'Friends Activity',
    'profile.menu.myProfile': 'My Profile',
    'profile.menu.favorites': 'Favorites',
    'profile.menu.playlists': 'My Playlists',
    'profile.menu.settings': 'Settings',
    'profile.menu.logout': 'Sign Out',
    'profile.stats.songs': 'Songs',
    'profile.stats.favorites': 'Favorites',
    'profile.stats.hours': 'Hours',
    'devices.title': 'Smart Devices',
    'devices.empty': 'Open SoundVizion on another screen to continue listening.',
    'friends.title': 'Friends Activity',
    'friends.empty': 'Launch SoundVizion on your TV or phone to continue playback.',
    'notifications.system.offlineEnabled.title': 'Offline mode on',
    'notifications.system.offlineEnabled.body': 'We blocked all traffic until you disable it.',
    'notifications.system.offlineDisabled.title': 'Offline mode off',
    'notifications.system.offlineDisabled.body': 'Connection restored and requests are flowing again.',
    'notifications.achievements.firstPlay.title': 'Achievement unlocked',
    'notifications.achievements.firstPlay.body': 'You played your first song on SoundVizion.',
    'notifications.download.started.title': 'Download started',
    'notifications.download.started.body': '{track} is downloading for offline listening.',
    'notifications.download.completed.title': 'Download complete',
    'notifications.download.completed.body': '{track} is ready in Downloads.',
    'notifications.download.failed.title': 'Download failed',
    'notifications.download.failed.body': 'Could not download {track}. Check your connection.',
    'notifications.favorites.added.title': 'Saved to favorites',
    'notifications.favorites.added.body': '{track} was added to your favorites.',
    'notifications.favorites.removed.title': 'Removed from favorites',
    'notifications.favorites.removed.body': '{track} is no longer marked as favorite.',
    'notifications.system.discoveryEnabled.title': 'Discovery Mode active',
    'notifications.system.discoveryEnabled.body': 'Similar tracks will be added to the queue automatically.',
    'notifications.system.discoveryDisabled.title': 'Discovery Mode off',
    'notifications.system.discoveryDisabled.body': 'Queue will stop after the current tracks.',
    'notifications.moodLock.enabled.title': 'Mood Lock enabled',
    'notifications.moodLock.enabled.body': 'Queue locked to mood: {mood}.',
    'notifications.moodLock.disabled.title': 'Mood Lock disabled',
    'notifications.moodLock.disabled.body': 'Queue will adapt dynamically again.',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.browse': 'Explorer',
    'nav.radio': 'Radio Live',
    'nav.playlists': 'Playlists',
    'nav.library': 'Votre musique',
    'nav.albums': 'Albums',
    'nav.artists': 'Artistes',
    'nav.stats': 'Statistiques',
    'nav.liveRooms': 'Sessions en Direct',
    'nav.settings': 'Paramètres',
    'nav.section.collection': 'Collection',
    'header.searchPlaceholder': 'Rechercher artistes, titres, albums...',
    'notifications.title': 'Notifications',
    'notifications.markAllRead': 'Tout marquer comme lu',
    'notifications.clearAll': 'Tout effacer',
    'notifications.none': 'Pas encore de notifications',
    'notifications.history': 'Voir tout l’historique',
    'notifications.justNow': 'À l’instant',
    'notifications.minutesAgo': 'Il y a {value} min',
    'notifications.hoursAgo': 'Il y a {value} h',
    'notifications.daysAgo': 'Il y a {value} j',
    'profile.activity': 'Activité des amis',
    'profile.menu.myProfile': 'Mon profil',
    'profile.menu.favorites': 'Favoris',
    'profile.menu.playlists': 'Mes playlists',
    'profile.menu.settings': 'Paramètres',
    'profile.menu.logout': 'Déconnexion',
    'profile.stats.songs': 'Titres',
    'profile.stats.favorites': 'Favoris',
    'profile.stats.hours': 'Heures',
    'devices.title': 'Appareils connectés',
    'devices.empty': 'Ouvre SoundVizion sur un autre écran pour continuer la lecture.',
    'friends.title': 'Activité des amis',
    'friends.empty': 'Lancez SoundVizion sur votre TV ou téléphone pour reprendre.',
    'notifications.system.offlineEnabled.title': 'Mode hors-ligne activé',
    'notifications.system.offlineEnabled.body': 'On bloque tout le trafic jusqu’à désactivation.',
    'notifications.system.offlineDisabled.title': 'Mode hors-ligne désactivé',
    'notifications.system.offlineDisabled.body': 'La connexion est revenue, les requêtes passent.',
    'notifications.achievements.firstPlay.title': 'Succès débloqué',
    'notifications.achievements.firstPlay.body': 'Vous avez joué votre première chanson sur SoundVizion.',
    'notifications.download.started.title': 'Téléchargement lancé',
    'notifications.download.started.body': '{track} se télécharge pour une écoute hors ligne.',
    'notifications.download.completed.title': 'Téléchargement terminé',
    'notifications.download.completed.body': '{track} est prêt dans Téléchargements.',
    'notifications.download.failed.title': 'Téléchargement échoué',
    'notifications.download.failed.body': 'Impossible de télécharger {track}. Vérifiez votre connexion.',
    'notifications.favorites.added.title': 'Ajouté aux favoris',
    'notifications.favorites.added.body': '{track} a été ajouté à vos favoris.',
    'notifications.favorites.removed.title': 'Supprimé des favoris',
    'notifications.favorites.removed.body': '{track} ne fait plus partie des favoris.',
    'notifications.system.discoveryEnabled.title': 'Mode Découverte actif',
    'notifications.system.discoveryEnabled.body': 'Des titres similaires seront ajoutés à la file automatiquement.',
    'notifications.system.discoveryDisabled.title': 'Mode Découverte désactivé',
    'notifications.system.discoveryDisabled.body': 'La file s’arrêtera après les titres actuels.',
    'notifications.moodLock.enabled.title': 'Verrouillage d’ambiance activé',
    'notifications.moodLock.enabled.body': 'File d’attente verrouillée sur l’ambiance : {mood}.',
    'notifications.moodLock.disabled.title': 'Verrouillage d’ambiance désactivé',
    'notifications.moodLock.disabled.body': 'La file d’attente s’adaptera à nouveau dynamiquement.',
  },
  de: {
    'nav.home': 'Start',
    'nav.browse': 'Entdecken',
    'nav.radio': 'Live-Radio',
    'nav.playlists': 'Playlists',
    'nav.library': 'Meine Musik',
    'nav.albums': 'Alben',
    'nav.artists': 'Künstler',
    'nav.stats': 'Statistiken',
    'nav.liveRooms': 'Live-Räume',
    'nav.settings': 'Einstellungen',
    'nav.section.collection': 'Sammlung',
    'header.searchPlaceholder': 'Künstler, Songs, Alben suchen...',
    'notifications.title': 'Benachrichtigungen',
    'notifications.markAllRead': 'Alle als gelesen markieren',
    'notifications.clearAll': 'Alle löschen',
    'notifications.none': 'Keine Benachrichtigungen',
    'notifications.history': 'Verlauf anzeigen',
    'notifications.justNow': 'Gerade eben',
    'notifications.minutesAgo': 'Vor {value} Min',
    'notifications.hoursAgo': 'Vor {value} Std',
    'notifications.daysAgo': 'Vor {value} Tg',
    'profile.activity': 'Aktivität von Freunden',
    'profile.menu.myProfile': 'Mein Profil',
    'profile.menu.favorites': 'Favoriten',
    'profile.menu.playlists': 'Meine Playlists',
    'profile.menu.settings': 'Einstellungen',
    'profile.menu.logout': 'Abmelden',
    'profile.stats.songs': 'Songs',
    'profile.stats.favorites': 'Favoriten',
    'profile.stats.hours': 'Stunden',
    'devices.title': 'Intelligente Geräte',
    'devices.empty': 'Öffnen Sie SoundVizion auf einem anderen Gerät.',
    'friends.title': 'Aktivität von Freunden',
    'friends.empty': 'Starte SoundVizion auf TV oder Handy, um weiterzuhören.',
    'notifications.system.offlineEnabled.title': 'Offline-Modus an',
    'notifications.system.offlineEnabled.body': 'Der gesamte Traffic ist blockiert, bis du es ausschaltest.',
    'notifications.system.offlineDisabled.title': 'Offline-Modus aus',
    'notifications.system.offlineDisabled.body': 'Verbindung wiederhergestellt, Anfragen laufen.',
    'notifications.achievements.firstPlay.title': 'Erfolg freigeschaltet',
    'notifications.achievements.firstPlay.body': 'Du hast deinen ersten Song auf SoundVizion gespielt.',
    'notifications.download.started.title': 'Download gestartet',
    'notifications.download.started.body': '{track} wird für Offline-Hören geladen.',
    'notifications.download.completed.title': 'Download abgeschlossen',
    'notifications.download.completed.body': '{track} ist jetzt in Downloads verfügbar.',
    'notifications.download.failed.title': 'Download fehlgeschlagen',
    'notifications.download.failed.body': 'Konnte {track} nicht herunterladen. Prüfe die Verbindung.',
    'notifications.favorites.added.title': 'Zu Favoriten hinzugefügt',
    'notifications.favorites.added.body': '{track} wurde zu deinen Favoriten hinzugefügt.',
    'notifications.favorites.removed.title': 'Aus Favoriten entfernt',
    'notifications.favorites.removed.body': '{track} ist nicht mehr in deinen Favoriten.',
    'notifications.system.discoveryEnabled.title': 'Entdeckungsmodus aktiv',
    'notifications.system.discoveryEnabled.body': 'Ähnliche Titel werden automatisch zur Warteschlange hinzugefügt.',
    'notifications.system.discoveryDisabled.title': 'Entdeckungsmodus aus',
    'notifications.system.discoveryDisabled.body': 'Die Wiedergabe stoppt nach den aktuellen Titeln.',
    'notifications.moodLock.enabled.title': 'Stimmungs-Sperre aktiviert',
    'notifications.moodLock.enabled.body': 'Warteschlange auf Stimmung gesperrt: {mood}.',
    'notifications.moodLock.disabled.title': 'Stimmungs-Sperre deaktiviert',
    'notifications.moodLock.disabled.body': 'Warteschlange passt sich wieder dynamisch an.',
  },
};

const DEFAULT_LANGUAGE: Language = 'es';

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/{(\w+)}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : '';
  });
}

export function translate(key: TranslationKey, lang?: Language, params?: Record<string, string | number>): string {
  const storageLang = typeof window !== 'undefined' ? (localStorage.getItem('lang') as Language | null) : null;
  const resolverLang = lang || storageLang || DEFAULT_LANGUAGE;
  const safeLang = resolverLang in translations ? resolverLang : DEFAULT_LANGUAGE;
  const template = translations[safeLang][key] || translations[DEFAULT_LANGUAGE][key] || key;
  return interpolate(template, params);
}
