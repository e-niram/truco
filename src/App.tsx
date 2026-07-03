import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from '@/lib/LanguageContext';
import { LobbyPage } from '@/pages/LobbyPage';
import { GamePage } from '@/pages/GamePage';
import { SoloGamePage } from '@/pages/SoloGamePage';

export function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/solo" element={<SoloGamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </LanguageProvider>
  );
}
