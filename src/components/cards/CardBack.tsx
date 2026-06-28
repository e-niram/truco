export function CardBack() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 'var(--card-radius)',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle geometric pattern */}
      <div
        style={{
          position: 'absolute',
          inset: '4px',
          borderRadius: '7px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '8px',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: 'rgba(255,255,255,0.06)',
        }}
      >
        ♠
      </div>
    </div>
  );
}
