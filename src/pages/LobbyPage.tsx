import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createGame } from '@/hooks/useGameActions';
import { usePlayerIdentity } from '@/hooks/usePlayerIdentity';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/Button';
import { CopyLink } from '@/components/lobby/CopyLink';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { TutorialModal } from '@/components/lobby/TutorialModal';

export function LobbyPage() {
  const { token } = usePlayerIdentity();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const gameId = await createGame(token);
      const url = `${window.location.origin}${window.location.pathname}#/game/${gameId}`;
      setShareUrl(url);
    } catch {
      setError(t('createError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={cardStyle}
      >
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Truco Mineiro
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '14px', marginTop: '6px' }}>
            {t('subtitle')}
          </p>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher />
          </div>
        </div>

        {!shareUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? t('creating') : t('newGame')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/solo')}>
              {t('playSolo')}
            </Button>
            <Button variant="ghost" onClick={() => setTutorialOpen(true)}>
              {t('tutorialButton')}
            </Button>
            {error && (
              <p style={{ fontSize: '13px', color: '#e53e3e', textAlign: 'center' }}>{error}</p>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>
                {t('gameCreated')}
              </p>
            </div>
            <CopyLink url={shareUrl} />
            <Button
              variant="ghost"
              onClick={() => {
                const id = shareUrl.split('/game/')[1];
                if (id) navigate(`/game/${id}`);
              }}
            >
              {t('joinGame')}
            </Button>
          </motion.div>
        )}
      </motion.div>

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-bg)',
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '360px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '20px',
  padding: '36px 28px',
};
