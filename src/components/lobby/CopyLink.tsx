import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface CopyLinkProps {
  url: string;
}

export function CopyLink({ url }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)',
          wordBreak: 'break-all',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {url}
      </div>
      <Button onClick={handleCopy} variant={copied ? 'ghost' : 'primary'}>
        {copied ? 'Copiado!' : 'Copiar link'}
      </Button>
    </div>
  );
}
