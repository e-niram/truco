import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '100px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#fff',
            whiteSpace: 'nowrap',
            zIndex: 200,
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
