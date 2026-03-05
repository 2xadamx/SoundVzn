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
import { logError, logInfo } from './utils/frontendLogger';
import { AlbumProfile } from './components/views/AlbumProfile';
import { RadioView } from './components/views/RadioView';
import { ArtistsView } from './components/views/ArtistsView';
import { AlbumsView } from './components/views/AlbumsView';
import { initDatabase, updateProfile } from './utils/database';
import { installNetworkGuard } from './utils/networkGuard';
import { BACKEND_URL } from './utils/apiConfig';
import { AudioPreloader } from './components/player/AudioPreloader';
import { HologramVisualizer } from './components/player/HologramVisualizer';
import { GlassCenter } from './components/views/GlassCenter';
import { FavoritesView } from './components/views/FavoritesView';
import { DownloadsView } from './components/views/DownloadsView';
import { LikedArtistsView } from './components/views/LikedArtistsView';
import { FollowedPlaylistsView } from './components/views/FollowedPlaylistsView';


function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [showIntro, setShowIntro] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [navigationParams, setNavigationParams] = useState<any>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  const handleNavigate = (view: string, params?: any) => {
    setCurrentView(view);
    if (params) setNavigationParams(params);
  };

  useEffect(() => {
    const startApp = async () => {
      await initDatabase();
      setIsDbReady(true);

      // 1. Detect token from URL hash (Google Implicit Flow)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          console.log('📡 Token detected in URL hash');
          handleLoginSuccess({ access_token: token, isGoogle: true });
          // Clear hash securely
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return;
        }
      }

      // 2. Check stored token
      const localToken = localStorage.getItem('auth_access_token');
      const googleToken = localStorage.getItem('google_token');
      if (localToken || googleToken) {
        setIsAuthenticated(true);
      }
    };

    startApp();
  }, []);

  useEffect(() => {
    installNetworkGuard();
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      logError('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      logError('Unhandled rejection', {
        reason: (event as any)?.reason?.message || String((event as any)?.reason || ''),
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    logInfo('Frontend logger initialized');
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'stellar-dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'radiant-light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, []);

  const handleLoginSuccess = async (credentialResponse: any) => {
    console.log('Login Success:', credentialResponse);
    const token = credentialResponse.access_token || credentialResponse.credential;
    setIsAuthenticated(true);

    const isGoogleAuth = credentialResponse.isGoogle === true;
    const localProfileRaw = localStorage.getItem('user_profile');
    const localProfile = localProfileRaw ? JSON.parse(localProfileRaw) : null;
    const isLocalAuth = !isGoogleAuth && (!!localProfile || token === 'local_auth_session');

    if (isLocalAuth) {
      console.log('Local session started');
      localStorage.removeItem('google_token');
      if (localProfile) {
        await updateProfile({
          name: localProfile.name || 'Usuario',
          email: localProfile.email || '',
          avatar: localProfile.avatar || '',
          bio: "SoundVizion Audio Enthusiast"
        });
        await initDatabase();
      }
      return;
    }

    localStorage.setItem('google_token', token);

    // Fetch real profile data from Google
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await response.json();

      if (userData && !userData.error) {
        await updateProfile({
          name: userData.name,
          email: userData.email,
          avatar: userData.picture,
          bio: "SoundVizion Audio Enthusiast"
        });
        console.log('✅ Profile synchronized:', userData.name);

        // Re-init database to switch to the new user namespace
        await initDatabase();

        // Clean URL hash IMMEDIATELY to prevent re-triggering logic on refresh
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        // Notify backend about the new user for the welcome email
        try {
          fetch(`${BACKEND_URL}/api/auth/welcome-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userData.email, name: userData.name })
          });
        } catch (e) {
          console.warn('[App] Failed to trigger welcome email');
        }

        // Reload to refresh all UI states with new user data
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Failed to sync profile with Google:', error);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'search':
        return <MusicSearch onNavigate={handleNavigate} />;
      case 'library':
        return <LibraryView />;
      case 'browse':
        return <BrowseView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      case 'playlists':
        return <PlaylistsView />;
      case 'glass-center':
        return <GlassCenter onNavigate={handleNavigate} />;
      case 'home':
        return <HomeView onNavigate={handleNavigate} />;
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
      case 'downloads':
        return <DownloadsView />;
      case 'liked-artists':
        return <LikedArtistsView onNavigate={handleNavigate} />;
      case 'followed-playlists':
        return <FollowedPlaylistsView />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                🚧 Vista en desarrollo
              </h2>
              <p className="text-text-tertiary">
                La vista "{currentView}" estará disponible pronto
              </p>
            </div>
          </div>
        );
    }
  };

  const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "454597442600-6cp3mid14d7uvk2ob2q2sbe61dmnuvl1.apps.googleusercontent.com";

  if (!isDbReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-white font-black text-4xl tracking-tighter"
        >
          SOUNDVIZION
        </motion.div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HologramVisualizer />
      <AudioPreloader />


      {showIntro && (
        <IntroAnimation onComplete={() => setShowIntro(false)} />
      )}

      {!showIntro && !isAuthenticated && (
        <LoginScreen
          clientId={GOOGLE_CLIENT_ID}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {!showIntro && isAuthenticated && (
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
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </MainLayout>
      )}
    </GoogleOAuthProvider>
  );
}

export default App;

