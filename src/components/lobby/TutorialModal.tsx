import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/Button';
import type { TranslationKey } from '@/lib/i18n';

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS: { titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { titleKey: 'tutorialTitle1', bodyKey: 'tutorialBody1' },
  { titleKey: 'tutorialTitle2', bodyKey: 'tutorialBody2' },
  { titleKey: 'tutorialTitle3', bodyKey: 'tutorialBody3' },
  { titleKey: 'tutorialTitle4', bodyKey: 'tutorialBody4' },
  { titleKey: 'tutorialTitle5', bodyKey: 'tutorialBody5' },
];

export function TutorialModal({ open, onClose }: TutorialModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  function goNext() {
    if (isLast) {
      onClose();
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goPrevious() {
    if (isFirst) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={overlayStyle}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={cardStyle}
          >
            <button onClick={onClose} aria-label="Close" style={closeButtonStyle}>
              ×
            </button>

            <div style={dotsRowStyle}>
              {STEPS.map((_, i) => (
                <span key={i} style={dotStyle(i === step)} />
              ))}
            </div>

            <div style={contentAreaStyle}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -24 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  style={{ textAlign: 'center' }}
                >
                  <h2 style={titleStyle}>{t(current.titleKey)}</h2>
                  <p style={bodyStyle}>{t(current.bodyKey)}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div style={navRowStyle}>
              <div style={navItemStyle}>
                {!isFirst && (
                  <Button variant="ghost" onClick={goPrevious}>
                    {t('tutorialPrevious')}
                  </Button>
                )}
              </div>
              <div style={navItemStyle}>
                <Button onClick={goNext}>
                  {isLast ? t('tutorialDone') : t('tutorialNext')}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  backgroundColor: 'rgba(0,0,0,0.6)',
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '20px',
  padding: '36px 28px 28px',
  width: '100%',
  maxWidth: '360px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '14px',
  right: '16px',
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '22px',
  lineHeight: 1,
  cursor: 'pointer',
  padding: '4px',
};

const dotsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '6px',
};

function dotStyle(active: boolean): React.CSSProperties {
  return {
    width: active ? '16px' : '6px',
    height: '6px',
    borderRadius: '3px',
    background: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.18)',
    transition: 'all 200ms ease',
  };
}

const contentAreaStyle: React.CSSProperties = {
  minHeight: '160px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const titleStyle: React.CSSProperties = {
  fontSize: '19px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  marginBottom: '10px',
};

const bodyStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.55,
  color: 'rgba(255,255,255,0.65)',
};

const navRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
};

const navItemStyle: React.CSSProperties = {
  flex: 1,
};
