import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from './components/layout/MainLayout';
import { BrowseView } from './components/views/BrowseView';
import { MusicSearch } from './components/MusicSearch';
import { LibraryView } from './components/LibraryView';
import { IntroAnimation } from './components/IntroAnimation';
import { LoginScreen } from './components/LoginScreen';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SettingsView } from './components/views/SettingsView';
import { ProfileView } from './components/views/ProfileView';
import { PlaylistsView } from './components/views/PlaylistsView';
import { HomeView } from './components/views/HomeView';
import { ArtistProfile } from './components/views/ArtistProfile';
import { AlbumProfile } from './components/views/AlbumProfile';
import { RadioView } from './components/views/RadioView';
import { ArtistsView } from './components/views/ArtistsView';
import { AlbumsView } from './components/views/AlbumsView';
import { initDatabase } from './utils/database';
import { initWebDatabase } from './utils/webDatabase';
import { installNetworkGuard } from './utils/networkGuard';
import { AudioPreloader } from './components/player/AudioPreloader';
import { VividNebula } from './components/VividNebula';
import { GlassCenter } from './components/views/GlassCenter';
import { FavoritesView } from './components/views/FavoritesView';
import { RecentView } from './components/views/RecentView';
import { DownloadsView } from './components/views/DownloadsView';
import { LikedArtistsView } from './components/views/LikedArtistsView';
import { FollowedPlaylistsView } from './components/views/FollowedPlaylistsView';
import { StatsView } from './components/views/StatsView';
import { ToastSystem } from './components/ui/ToastSystem';
import { ConnectivityGuard } from './components/ConnectivityGuard';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ZenView } from './components/views/ZenView';
import { FriendsView } from './components/views/FriendsView';
import { ThemeMarketplace } from './components/views/ThemeMarketplace';
import { usePlayerStore } from './store/player';
import { useAuth } from './store/auth';
import { socialService } from './utils/socialService';

// ── BOOTLOADER: SYSTEM SYNCHRONIZATION (V2.1.0) ──────────────────────────
const SYNC_VERSION = 'v14_clear_stale_tokens';
const clearSoundVznStorage = () => {
  const prefixes = ['svzn_', 'soundvzn_', 'auth_', 'google_', 'lastfm_'];
  Object.keys(localStorage)
    .filter((key) => {
      if (key === 'svzn_user' || key === 'svzn_id' || key === 'svzn_sync_token') return false;
      return prefixes.some((prefix) => key.startsWith(prefix));
    })
    .forEach((key) => localStorage.removeItem(key));
};

if (localStorage.getItem('svzn_sync_token') !== SYNC_VERSION) {
  console.info('[Bootloader] System update detected. Synchronizing local state...');
  clearSoundVznStorage();
  try {
     indexedDB.deleteDatabase('soundvzn_web');
  } catch(e) {}
  localStorage.setItem('svzn_sync_token', SYNC_VERSION);
  window.location.reload();
}

const IS_ELECTRON = !!(window as any).electron;

function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [showIntro, setShowIntro] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [navigationParams, setNavigationParams] = useState<any>(null);
  const { isAuthenticated, initialize: initializeAuth } = useAuth();
  const { isZenMode, setIsZenMode } = usePlayerStore();

  const handleNavigate = (view: string, params?: any) => {
    console.log(`[Navigation] Moving to: ${view}`, params);
    setCurrentView(view);
    setNavigationParams(params || null);
  };

  useEffect(() => {
    const handleEventNav = (e: any) => {
      const { view, params } = e.detail || {};
      if (view) handleNavigate(view, params);
    };
    window.addEventListener('navigate-to', handleEventNav);
    return () => window.removeEventListener('navigate-to', handleEventNav);
  }, []);

  const { addToast } = usePlayerStore();
  useEffect(() => {
    const handleAuthError = (e: any) => {
      addToast({ type: 'error', message: e.detail.message, duration: 5000 });
    };
    const handleNetworkError = (e: any) => {
      addToast({ type: 'error', message: e.detail.message, duration: 4000 });
    };

    window.addEventListener('svzn:auth_error', handleAuthError);
    window.addEventListener('svzn:network_error', handleNetworkError);
    
    return () => {
      window.removeEventListener('svzn:auth_error', handleAuthError);
      window.removeEventListener('svzn:network_error', handleNetworkError);
    };
  }, [addToast]);

  useEffect(() => {
    const startApp = async () => {
      try {
        if (IS_ELECTRON) {
          await initDatabase();
        } else {
          await initWebDatabase();
        }
      } catch (e) {
        console.warn('[App] DB init failed, continuing anyway.', e);
      }

      // ── CRITICAL: Synchronize Identity ──
      await initializeAuth();
      
      setIsDbReady(true);
    };

    const timeout = setTimeout(() => {
      setIsDbReady(true);
    }, 8000);

    startApp();
    return () => clearTimeout(timeout);
  }, [initializeAuth]);


  useEffect(() => {
    installNetworkGuard();
  }, []);

  // ── Deep Link Handling (Wait for Auth & DB) ──────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && isDbReady) {
      const params = new URLSearchParams(window.location.search);
      const inviteTarget = params.get('addFriend');
      if (inviteTarget && inviteTarget !== 'new') {
        const processRequest = async () => {
          try {
            // Short delay to ensure session is fully ready
            await new Promise(r => setTimeout(r, 800));
              const ok = await socialService.sendFriendRequest(inviteTarget);
              if (ok) {
                console.log('[Social] Invitation deep-link processed');
                usePlayerStore.getState().addToast({
                  type: 'success',
                  message: '¡Invitación de amigo enviada! ✨',
                  duration: 4000
                });
                // Remove param from URL without reloading
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
                // Jump to social tab
                handleNavigate('friends');
              }
          } catch (e) {
            console.warn('[Social] Link processing error', e);
          }
        };
        processRequest();
      }
    }
  }, [isAuthenticated, isDbReady]);

  const handleLoginSuccess = async () => {
    await initializeAuth();
  };

  const renderView = () => {
    switch (currentView) {
      case 'search':
        return <MusicSearch onNavigate={handleNavigate} />;
      case 'library':
        return <LibraryView onNavigate={handleNavigate} />;
      case 'browse':
        return <BrowseView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView userId={navigationParams?.userId} />;
      case 'playlists':
        return <PlaylistsView onNavigate={handleNavigate} />;
      case 'playlist':
        return <PlaylistsView onNavigate={handleNavigate} initialPlaylistId={navigationParams?.playlistId} />;
      case 'home':
        return <HomeView onNavigate={handleNavigate} />;
      case 'stats':
        return <StatsView userId={navigationParams?.userId} />;
      case 'marketplace':
        return (
          <ThemeMarketplace 
            onClose={() => handleNavigate('friends')} 
            onPurchaseSuccess={() => {}} 
            onOpenStudio={() => handleNavigate('studio')} 
          />
        );
      case 'artist':
        return (
          <ArtistProfile
            artistId={navigationParams?.artistId}
            artistName={navigationParams?.artistName || ''}
            onBack={() => setCurrentView(navigationParams?.from || 'search')}
            onNavigate={handleNavigate}
          />
        );
      case 'album':
        return (
          <AlbumProfile
            albumId={navigationParams?.albumId}
            albumName={navigationParams?.albumName || ''}
            artistName={navigationParams?.artistName}
            onBack={() => setCurrentView(navigationParams?.from || 'search')}
            onNavigate={handleNavigate}
          />
        );
      case 'radio':
        return <RadioView />;
      case 'artists':
        return <ArtistsView onNavigate={handleNavigate} />;
      case 'albums':
        return <AlbumsView onNavigate={handleNavigate} />;
      case 'favorites':
        return <FavoritesView />;
      case 'recent':
        return <RecentView />;
      case 'downloads':
        return <DownloadsView />;
      case 'liked-artists':
        return <LikedArtistsView onNavigate={handleNavigate} />;
      case 'followed-playlists':
        return <FollowedPlaylistsView />;
      case 'friends':
        return <FriendsView initialChatId={navigationParams?.openChatId} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <h2 className="text-2xl font-bold text-white mb-2">Vista en desarrollo</h2>
          </div>
        );
    }
  };

  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "";

  if (!isDbReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050508] gap-4">
        <div className="w-12 h-12 border-t-2 border-primary rounded-full animate-spin" />
        <div className="text-center">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] block mb-2">SoundVzn Core</span>
            <span className="text-[8px] text-white/10 uppercase tracking-widest block">Inicializando motor de audio de baja latencia</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-root relative w-full h-full overflow-hidden bg-[#020205]">
        <VividNebula />
        
        <div className="app-content-container relative w-full h-full z-10">
          <ToastSystem />
          <AudioPreloader />
          <ConnectivityGuard />

          {/* Intro Animation Layer */}
          <AnimatePresence mode="wait">
            {showIntro && (
              <motion.div
                key="intro-container"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="fixed inset-0 z-[200]"
              >
                <IntroAnimation onComplete={() => setShowIntro(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authentication & Main View Layer */}
          <AnimatePresence mode="wait">
            {!showIntro && (
              <motion.div
                key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full"
              >
                {!isAuthenticated ? (
                  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <LoginScreen
                      clientId={GOOGLE_CLIENT_ID}
                      onLoginSuccess={handleLoginSuccess}
                    />
                  </GoogleOAuthProvider>
                ) : (
                  <MainLayout
                    currentView={currentView}
                    onNavigate={handleNavigate}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentView}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                      >
                        {renderView()}
                      </motion.div>
                    </AnimatePresence>
                  </MainLayout>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Foreground Layers */}
          <AnimatePresence>
            {isZenMode && (
              <ZenView onClose={() => setIsZenMode(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
