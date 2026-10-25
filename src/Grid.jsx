export default function Grid({
  grid,
  numbers,
  selected,
  highlightedCells,
  onCellClick,
  showCursor = true,
}) {
  return (
    <div
      className="inline-grid overflow-hidden"
      style={{
        gridTemplateColumns: 'repeat(5, var(--cell-size))',
        gridTemplateRows: 'repeat(5, var(--cell-size))',
        gap: '3px',
        padding: '3px',
        background: 'var(--surface)',
        boxShadow: '0 0 48px var(--glow), 0 2px 8px rgba(0,0,0,0.12)',
        borderRadius: '12px',
      }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const num = numbers?.[r]?.[c]
          const isSel = selected?.[0] === r && selected?.[1] === c
          const isHl =
            !isSel &&
            highlightedCells?.some(([hr, hc]) => hr === r && hc === c)

          let bg = 'var(--cell)'
          if (cell.black) bg = 'var(--blk)'
          else if (isSel) bg = 'var(--sel)'
          else if (isHl) bg = 'var(--hl)'

          let letterColor
          if (cell.state === 'correct') letterColor = 'var(--correct)'
          if (cell.state === 'incorrect') letterColor = 'var(--incorrect)'

          return (
            <div
              key={`${r}-${c}`}
              className="grid-cell relative flex items-center justify-center select-none cursor-pointer"
              style={{
                background: bg,
                borderRadius: '6px',
                fontSize: '19px',
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
              onClick={() => onCellClick(r, c)}
            >
              {!cell.black && num > 0 && (
                <span
                  className="absolute leading-none"
                  style={{
                    top: '4px',
                    left: '5px',
                    fontSize: '9px',
                    fontWeight: 500,
                    color: 'var(--accent)',
                  }}
                >
                  {num}
                </span>
              )}
              {!cell.black && cell.letter && (
                <span
                  className="mt-1"
                  style={letterColor ? { color: letterColor } : undefined}
                >
                  {cell.letter}
                </span>
              )}
              {showCursor && !cell.black && isSel && !cell.letter && (
                <span
                  className="absolute"
                  style={{
                    bottom: '11px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '18px',
                    height: '2px',
                    background: 'var(--accent)',
                    animation: 'blink 1.2s step-end infinite',
                  }}
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
