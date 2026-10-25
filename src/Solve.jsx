import { useState, useEffect, useMemo } from 'react'
import Grid from './Grid'
import Keyboard from './Keyboard'

export default function Solve({ puzzle }) {
  const { grid: solution, numbers, acrossClues, downClues, acrossStarts, downStarts } =
    puzzle

  const solveKey = 'minicross-' + location.hash.slice(1)

  function freshGrid() {
    return solution.map((row) =>
      row.map((cell) => ({ black: cell.black, letter: '' }))
    )
  }

  const [userGrid, setUserGrid] = useState(() => {
    try {
      const saved = localStorage.getItem(solveKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 5 &&
            parsed.every((row, r) => Array.isArray(row) && row.length === 5 &&
              row.every((cell, c) => cell.black === solution[r][c].black)))
          return parsed
      }
    } catch {}
    return freshGrid()
  })
  const [selected, setSelected] = useState(() => {
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (!solution[r][c].black) return [r, c]
    return null
  })
  const [direction, setDirection] = useState('across')
  const [revealed, setRevealed] = useState(false)

  const solved = useMemo(() => {
    return solution.every((row, r) =>
      row.every((cell, c) =>
        cell.black || userGrid[r][c].letter === cell.letter
      )
    )
  }, [userGrid, solution])

  function getDisplayGrid() {
    if (!revealed) return userGrid
    return solution.map((row, r) =>
      row.map((cell, c) => {
        if (cell.black) return cell
        const userLetter = userGrid[r][c].letter
        return {
          ...cell,
          state: userLetter === cell.letter ? 'correct' : 'incorrect',
        }
      })
    )
  }

  function getHighlightedCells() {
    if (!selected || revealed) return []
    const [r, c] = selected
    if (solution[r][c].black) return []
    const cells = []
    if (direction === 'across') {
      let sc = c
      while (sc > 0 && !solution[r][sc - 1].black) sc--
      for (let cc = sc; cc < 5 && !solution[r][cc].black; cc++)
        cells.push([r, cc])
    } else {
      let sr = r
      while (sr > 0 && !solution[sr - 1][c].black) sr--
      for (let rr = sr; rr < 5 && !solution[rr][c].black; rr++)
        cells.push([rr, c])
    }
    return cells
  }

  function getActiveClueNum(dir) {
    if (!selected || revealed) return null
    const [r, c] = selected
    if (solution[r][c].black) return null
    if (dir === 'across') {
      let sc = c
      while (sc > 0 && !solution[r][sc - 1].black) sc--
      return acrossStarts.find(s => s.row === r && s.col === sc)?.num ?? null
    }
    let sr = r
    while (sr > 0 && !solution[sr - 1][c].black) sr--
    return downStarts.find(s => s.row === sr && s.col === c)?.num ?? null
  }

  function advanceSel(r, c) {
    if (direction === 'across') {
      for (let nc = c + 1; nc < 5; nc++)
        if (!solution[r][nc].black) return setSelected([r, nc])
    } else {
      for (let nr = r + 1; nr < 5; nr++)
        if (!solution[nr][c].black) return setSelected([nr, c])
    }
  }

  function hasAcross(r, c) {
    return !solution[r][c].black &&
      ((c > 0 && !solution[r][c - 1].black) || (c < 4 && !solution[r][c + 1].black))
  }

  function hasDown(r, c) {
    return !solution[r][c].black &&
      ((r > 0 && !solution[r - 1][c].black) || (r < 4 && !solution[r + 1][c].black))
  }

  function handleCellClick(r, c) {
    if (solution[r][c].black || revealed) return
    if (selected && selected[0] === r && selected[1] === c) {
      const a = hasAcross(r, c), d = hasDown(r, c)
      if (a && d) setDirection((prev) => (prev === 'across' ? 'down' : 'across'))
      else if (d) setDirection('down')
      else setDirection('across')
    } else {
      setSelected([r, c])
      const a = hasAcross(r, c), d = hasDown(r, c)
      if (a && !d) setDirection('across')
      else if (d && !a) setDirection('down')
    }
  }

  function handleKeyDown(e) {
    if (!selected || revealed) return
    const [r, c] = selected

    if (e.key === 'Backspace') {
      e.preventDefault()
      if (userGrid[r][c].letter) {
        setUserGrid((prev) => {
          const next = prev.map((row) => row.map((cell) => ({ ...cell })))
          next[r][c].letter = ''
          return next
        })
      } else {
        if (direction === 'across') {
          for (let nc = c - 1; nc >= 0; nc--) {
            if (!solution[r][nc].black) {
              setSelected([r, nc])
              setUserGrid((prev) => {
                const next = prev.map((row) =>
                  row.map((cell) => ({ ...cell }))
                )
                next[r][nc].letter = ''
                return next
              })
              break
            }
          }
        } else {
          for (let nr = r - 1; nr >= 0; nr--) {
            if (!solution[nr][c].black) {
              setSelected([nr, c])
              setUserGrid((prev) => {
                const next = prev.map((row) =>
                  row.map((cell) => ({ ...cell }))
                )
                next[nr][c].letter = ''
                return next
              })
              break
            }
          }
        }
      }
      return
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (direction === 'across') { setDirection('down'); return }
      if (e.key === 'ArrowUp') {
        for (let nr = r - 1; nr >= 0; nr--)
          if (!solution[nr][c].black) { setSelected([nr, c]); break }
      } else {
        for (let nr = r + 1; nr < 5; nr++)
          if (!solution[nr][c].black) { setSelected([nr, c]); break }
      }
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (direction === 'down') { setDirection('across'); return }
      if (e.key === 'ArrowLeft') {
        for (let nc = c - 1; nc >= 0; nc--)
          if (!solution[r][nc].black) { setSelected([r, nc]); break }
      } else {
        for (let nc = c + 1; nc < 5; nc++)
          if (!solution[r][nc].black) { setSelected([r, nc]); break }
      }
      return
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      const letter = e.key.toUpperCase()
      setUserGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })))
        next[r][c].letter = letter
        return next
      })
      advanceSel(r, c)
    }
  }

  function typeLetter(letter) {
    if (!selected || revealed) return
    const [r, c] = selected
    if (solution[r][c].black) return
    setUserGrid((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell })))
      next[r][c].letter = letter
      return next
    })
    advanceSel(r, c)
  }

  function doBackspace() {
    if (!selected || revealed) return
    const [r, c] = selected
    if (userGrid[r][c].letter) {
      setUserGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })))
        next[r][c].letter = ''
        return next
      })
    } else {
      if (direction === 'across') {
        for (let nc = c - 1; nc >= 0; nc--) {
          if (!solution[r][nc].black) {
            setSelected([r, nc])
            setUserGrid((prev) => {
              const next = prev.map((row) => row.map((cell) => ({ ...cell })))
              next[r][nc].letter = ''
              return next
            })
            break
          }
        }
      } else {
        for (let nr = r - 1; nr >= 0; nr--) {
          if (!solution[nr][c].black) {
            setSelected([nr, c])
            setUserGrid((prev) => {
              const next = prev.map((row) => row.map((cell) => ({ ...cell })))
              next[nr][c].letter = ''
              return next
            })
            break
          }
        }
      }
    }
  }

  function handleClueClick(dir, num) {
    if (revealed) return
    const starts = dir === 'across' ? acrossStarts : downStarts
    const s = starts.find((x) => x.num === num)
    if (s) {
      setSelected([s.row, s.col])
      setDirection(dir)
    }
  }

  function handleReset() {
    setUserGrid(freshGrid())
    setSelected(null)
    setRevealed(false)
    try { localStorage.removeItem(solveKey) } catch {}
  }

  useEffect(() => {
    try { localStorage.setItem(solveKey, JSON.stringify(userGrid)) } catch {}
  }, [userGrid, solveKey])

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
      onKeyDown={handleKeyDown}
    >
      <h1
        className="text-xl font-semibold mb-7"
        style={{ letterSpacing: '-0.02em' }}
      >
        minicross
      </h1>

      {solved && !revealed && (
        <div
          className="completion-pop w-full max-w-[380px] text-center py-3 rounded-xl mb-4 text-[15px] font-semibold"
          style={{ background: 'var(--surface)', color: 'var(--correct)' }}
        >
          solved!
        </div>
      )}

      <div className="relative mb-7">
        <Grid
          grid={getDisplayGrid()}
          numbers={numbers}
          selected={!revealed ? selected : null}
          highlightedCells={getHighlightedCells()}
          onCellClick={handleCellClick}
          showCursor={!revealed}
        />
      </div>

      {!revealed && selected && (
        <div className="mb-5">
          <Keyboard onKey={typeLetter} onBackspace={doBackspace} />
        </div>
      )}

      <div className="w-full max-w-[380px] grid grid-cols-2 gap-6 mb-7 min-w-0">
        {[
          { dir: 'across', items: acrossClues },
          { dir: 'down', items: downClues },
        ].map(({ dir, items }) => {
          const activeNum = getActiveClueNum(dir)
          return (
            <div key={dir} className="min-w-0">
              <h2
                className="text-[11px] font-medium uppercase mb-2.5"
                style={{ letterSpacing: '0.12em', color: 'var(--dim)' }}
              >
                {dir}
              </h2>
              {items.map((clue) => (
                <div
                  key={clue.num}
                  className={`clue-row flex gap-2 items-baseline cursor-pointer${
                    direction === dir && activeNum === clue.num ? ' clue-active' : ''
                  }`}
                  onClick={() => handleClueClick(dir, clue.num)}
                >
                  <span
                    className="text-sm font-semibold min-w-[16px]"
                    style={{
                      color: 'var(--accent)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {clue.num}
                  </span>
                  <span className="text-sm min-w-0">{clue.text}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-[380px] flex flex-col gap-1.5">
        <button
          onClick={() => setRevealed((r) => !r)}
          className="btn-accent w-full py-3.5 rounded-xl text-[15px] font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          {revealed ? 'hide answers' : 'reveal answers'}
        </button>
        <button
          onClick={handleReset}
          className="btn-ghost w-full py-2.5 text-[13px] font-medium"
          style={{ color: 'var(--dim)', background: 'none', border: 'none' }}
        >
          reset
        </button>
        <a
          href="/"
          className="btn-ghost block text-center py-2 text-[13px] font-medium no-underline"
          style={{ color: 'var(--dim)' }}
        >
          create your own
        </a>
      </div>
    </div>
  )
}
