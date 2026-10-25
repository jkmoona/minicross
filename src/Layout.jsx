export default function Layout({ children, onKeyDown, inputRef }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center outline-none"
      style={{
        paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
        paddingTop: '24px',
        paddingBottom: '48px',
      }}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <input
        ref={inputRef}
        inputMode="none"
        autoComplete="off"
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />
      <h1
        className="text-xl font-semibold mb-7"
        style={{ letterSpacing: '-0.02em' }}
      >
        minicross
      </h1>
      {children}
    </div>
  )
}
