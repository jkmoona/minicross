const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

export default function Keyboard({ onKey, onBackspace }) {
  function handle(e, key) {
    e.preventDefault()
    onKey(key)
  }

  return (
    <div className="w-full max-w-[380px] flex flex-col items-center gap-[5px]">
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-[4px] justify-center">
          {row.split('').map((key) => (
            <button
              key={key}
              onPointerDown={(e) => handle(e, key)}
              className="kbd-key flex items-center justify-center rounded-md text-[15px] font-medium select-none"
              style={{
                width: '34px',
                height: '42px',
                background: 'var(--surface)',
                color: 'var(--fg)',
              }}
            >
              {key}
            </button>
          ))}
          {i === 2 && (
            <button
              onPointerDown={(e) => { e.preventDefault(); onBackspace() }}
              className="kbd-key flex items-center justify-center rounded-md text-[13px] font-medium select-none"
              style={{
                width: '50px',
                height: '42px',
                background: 'var(--surface)',
                color: 'var(--dim)',
              }}
            >
              ←
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
