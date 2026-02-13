import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TitleBar } from '@components/TitleBar';
import { Sidebar } from '@components/Sidebar';
import { Player } from '@components/Player';
import { Library } from '@components/Library';
import { Onboarding } from '@components/Onboarding';
import { MiniPlayer } from '@components/MiniPlayer';
import { Stats } from '@components/Stats';
import { FocusMode } from '@components/FocusMode';
import { Equalizer } from '@components/Equalizer';
import { MusicSearch } from '@components/MusicSearch';
import { APISettings } from '@components/APISettings';
import { initDatabase } from '@utils/database';
import { initCacheDB } from '@utils/cacheManager';
import { loadAPIConfig } from '@utils/apiConfig';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('library');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('soundvzn_onboarding_complete');
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
    }

    initDatabase().catch(console.error);
    initCacheDB().catch(console.error);
    loadAPIConfig();
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('soundvzn_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowMiniPlayer(!showMiniPlayer);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showMiniPlayer]);

  const renderView = () => {
    switch (currentView) {
      case 'library':
        return <Library />;
      case 'search':
        return <MusicSearch />;
      case 'equalizer':
        return <Equalizer />;
      case 'stats':
        return <Stats />;
      case 'focus':
        return <FocusMode />;
      case 'playlists':
        return <div className="p-8 text-white">Playlists - Próximamente</div>;
      case 'albums':
        return <div className="p-8 text-white">Álbumes - Próximamente</div>;
      case 'artists':
        return <div className="p-8 text-white">Artistas - Próximamente</div>;
      case 'genres':
        return <div className="p-8 text-white">Géneros - Próximamente</div>;
      case 'settings':
        return <APISettings />;
      default:
        return <Library />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      <AnimatePresence>
        {showMiniPlayer && <MiniPlayer onClose={() => setShowMiniPlayer(false)} />}
      </AnimatePresence>

      <div className="h-screen flex flex-col bg-dark-900 text-white overflow-hidden">
        <TitleBar />
        
        <div className="flex-1 flex overflow-hidden">
          <Sidebar onNavigate={setCurrentView} currentView={currentView} />
          
          <main className="flex-1 overflow-auto bg-dark-900">
            {renderView()}
          </main>
        </div>

        <Player />
      </div>
    </>
  );
};

export default App;
