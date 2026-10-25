import { useState, useRef, useMemo, useEffect } from 'react'
import Grid from './Grid'
import Keyboard from './Keyboard'
import { encodePuzzle, numberGrid } from './encoding'
import { QRCodeSVG } from 'qrcode.react'

function emptyGrid() {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => ({ black: false, letter: '' }))
  )
}

const DRAFT_KEY = 'minicross-draft'

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!Array.isArray(d?.grid) || d.grid.length !== 5) return null
    return d
  } catch { return null }
}

function saveDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch {}
}

export default function Create() {
  const [draft] = useState(loadDraft)
  const [grid, setGrid] = useState(() => draft?.grid ?? emptyGrid())
  const [mode, setMode] = useState(() => draft?.mode ?? 'blocks')
  const [selected, setSelected] = useState(() => {
    const sel = draft?.selected
    if (!sel) return null
    if (draft?.grid?.[sel[0]]?.[sel[1]]?.black) return null
    return sel
  })
  const [direction, setDirection] = useState(() => draft?.direction ?? 'across')
  const [clues, setClues] = useState(() => draft?.clues ?? { across: {}, down: {} })
  const [shareUrl, setShareUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)
  const inputRef = useRef(null)

  const { numbers, acrossStarts, downStarts } = useMemo(
    () => numberGrid(grid),
    [grid]
  )

  function getHighlightedCells() {
    if (mode !== 'letters' || !selected) return []
    const [r, c] = selected
    if (grid[r][c].black) return []
    const cells = []
    if (direction === 'across') {
      let sc = c
      while (sc > 0 && !grid[r][sc - 1].black) sc--
      for (let cc = sc; cc < 5 && !grid[r][cc].black; cc++) cells.push([r, cc])
    } else {
      let sr = r
      while (sr > 0 && !grid[sr - 1][c].black) sr--
      for (let rr = sr; rr < 5 && !grid[rr][c].black; rr++) cells.push([rr, c])
    }
    return cells
  }

  function getActiveClueNum(dir) {
    if (!selected || mode === 'blocks') return null
    const [r, c] = selected
    if (grid[r][c].black) return null
    if (dir === 'across') {
      let sc = c
      while (sc > 0 && !grid[r][sc - 1].black) sc--
      return acrossStarts.find(s => s.row === r && s.col === sc)?.num ?? null
    }
    let sr = r
    while (sr > 0 && !grid[sr - 1][c].black) sr--
    return downStarts.find(s => s.row === sr && s.col === c)?.num ?? null
  }

  function advanceSel(r, c) {
    if (direction === 'across') {
      for (let nc = c + 1; nc < 5; nc++)
        if (!grid[r][nc].black) return setSelected([r, nc])
    } else {
      for (let nr = r + 1; nr < 5; nr++)
        if (!grid[nr][c].black) return setSelected([nr, c])
    }
  }

  function hasAcross(r, c) {
    return !grid[r][c].black &&
      ((c > 0 && !grid[r][c - 1].black) || (c < 4 && !grid[r][c + 1].black))
  }

  function hasDown(r, c) {
    return !grid[r][c].black &&
      ((r > 0 && !grid[r - 1][c].black) || (r < 4 && !grid[r + 1][c].black))
  }

  function handleCellClick(r, c) {
    if (mode === 'blocks') {
      setGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })))
        next[r][c] = { black: !next[r][c].black, letter: '' }
        return next
      })
      return
    }
    if (grid[r][c].black) return
    inputRef.current?.focus()
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
    if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== inputRef.current) return
    if (mode !== 'letters' || !selected) return
    const [r, c] = selected

    if (e.key === 'Backspace') {
      e.preventDefault()
      if (grid[r][c].letter) {
        setGrid((prev) => {
          const next = prev.map((row) => row.map((cell) => ({ ...cell })))
          next[r][c].letter = ''
          return next
        })
      } else {
        if (direction === 'across') {
          for (let nc = c - 1; nc >= 0; nc--) {
            if (!grid[r][nc].black) {
              setSelected([r, nc])
              setGrid((prev) => {
                const next = prev.map((row) => row.map((cell) => ({ ...cell })))
                next[r][nc].letter = ''
                return next
              })
              break
            }
          }
        } else {
          for (let nr = r - 1; nr >= 0; nr--) {
            if (!grid[nr][c].black) {
              setSelected([nr, c])
              setGrid((prev) => {
                const next = prev.map((row) => row.map((cell) => ({ ...cell })))
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
          if (!grid[nr][c].black) { setSelected([nr, c]); break }
      } else {
        for (let nr = r + 1; nr < 5; nr++)
          if (!grid[nr][c].black) { setSelected([nr, c]); break }
      }
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (direction === 'down') { setDirection('across'); return }
      if (e.key === 'ArrowLeft') {
        for (let nc = c - 1; nc >= 0; nc--)
          if (!grid[r][nc].black) { setSelected([r, nc]); break }
      } else {
        for (let nc = c + 1; nc < 5; nc++)
          if (!grid[r][nc].black) { setSelected([r, nc]); break }
      }
      return
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      const letter = e.key.toUpperCase()
      setGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })))
        next[r][c].letter = letter
        return next
      })
      advanceSel(r, c)
    }
  }

  function typeLetter(letter) {
    if (mode !== 'letters' || !selected) return
    const [r, c] = selected
    if (grid[r][c].black) return
    setGrid((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell })))
      next[r][c].letter = letter
      return next
    })
    advanceSel(r, c)
  }

  function doBackspace() {
    if (mode !== 'letters' || !selected) return
    const [r, c] = selected
    if (grid[r][c].letter) {
      setGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })))
        next[r][c].letter = ''
        return next
      })
    } else {
      if (direction === 'across') {
        for (let nc = c - 1; nc >= 0; nc--) {
          if (!grid[r][nc].black) {
            setSelected([r, nc])
            setGrid((prev) => {
              const next = prev.map((row) => row.map((cell) => ({ ...cell })))
              next[r][nc].letter = ''
              return next
            })
            break
          }
        }
      } else {
        for (let nr = r - 1; nr >= 0; nr--) {
          if (!grid[nr][c].black) {
            setSelected([nr, c])
            setGrid((prev) => {
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
    setMode('letters')
    const starts = dir === 'across' ? acrossStarts : downStarts
    const s = starts.find((x) => x.num === num)
    if (s) {
      setSelected([s.row, s.col])
      setDirection(dir)
    }
  }

  function switchToLetters() {
    setMode('letters')
    if (!selected) {
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++)
          if (!grid[r][c].black) { setSelected([r, c]); return }
    }
  }

  function handleShare() {
    setError('')
    if (acrossStarts.length === 0 && downStarts.length === 0) {
      setError('place blocks to create words')
      setErrorKey(k => k + 1)
      return
    }
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (!grid[r][c].black && !grid[r][c].letter) {
          setError('fill all white cells')
          setErrorKey(k => k + 1)
          return
        }
    const missingAcross = acrossStarts.some((s) => !clues.across[s.num]?.trim())
    const missingDown = downStarts.some((s) => !clues.down[s.num]?.trim())
    if (missingAcross || missingDown) {
      setError('fill all clues')
      setErrorKey(k => k + 1)
      return
    }
    const encoded = encodePuzzle(grid, acrossStarts, downStarts, clues)
    setShareUrl(`${location.origin}${location.pathname}#${encoded}`)
  }

  function handleClear() {
    const hasContent = grid.some(row => row.some(cell => cell.black || cell.letter))
    if (hasContent && !confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    setConfirmClear(false)
    setGrid(emptyGrid())
    setClues({ across: {}, down: {} })
    setSelected(null)
    setShareUrl(null)
    setError('')
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {
        setCopied('fallback')
        setTimeout(() => setCopied(false), 3000)
      }
    )
  }

  useEffect(() => {
    saveDraft({ grid, mode, selected, direction, clues })
  }, [grid, mode, selected, direction, clues])

  useEffect(() => {
    if (!shareUrl) return
    function onKey(e) {
      if (e.key === 'Escape') { setShareUrl(null); setCopied(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shareUrl])

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

      <div
        className="flex gap-1 p-1 rounded-lg mb-7"
        style={{ background: 'var(--surface)' }}
      >
        <button
          className="mode-btn px-4 py-1.5 rounded-md text-xs font-medium uppercase"
          style={{
            letterSpacing: '0.1em',
            background: mode === 'blocks' ? 'var(--cell)' : 'transparent',
            color: mode === 'blocks' ? 'var(--fg)' : 'var(--dim)',
          }}
          onClick={() => {
            setMode('blocks')
            setSelected(null)
          }}
        >
          blocks
        </button>
        <button
          className="mode-btn px-4 py-1.5 rounded-md text-xs font-medium uppercase"
          style={{
            letterSpacing: '0.1em',
            background: mode === 'letters' ? 'var(--cell)' : 'transparent',
            color: mode === 'letters' ? 'var(--fg)' : 'var(--dim)',
          }}
          onClick={switchToLetters}
        >
          letters
        </button>
      </div>

      <div className="relative mb-7">
        <Grid
          grid={grid}
          numbers={numbers}
          selected={mode === 'letters' ? selected : null}
          highlightedCells={getHighlightedCells()}
          onCellClick={handleCellClick}
        />
      </div>

      {mode === 'letters' && selected && (
        <div className="mb-5">
          <Keyboard onKey={typeLetter} onBackspace={doBackspace} />
        </div>
      )}

      {!grid.some(row => row.some(cell => cell.black || cell.letter)) && (
        <p className="text-xs font-light mb-5" style={{ color: 'var(--dim)' }}>
          {mode === 'blocks' ? 'tap cells to place blocks' : 'tap a cell and type'}
        </p>
      )}

      <div className="w-full max-w-[380px] grid grid-cols-2 gap-6 mb-7 min-w-0">
        {['across', 'down'].map((dir) => {
          const starts = dir === 'across' ? acrossStarts : downStarts
          const activeNum = getActiveClueNum(dir)
          return (
            <div key={dir} className="min-w-0">
              <h2
                className="text-[11px] font-medium uppercase mb-2.5"
                style={{ letterSpacing: '0.12em', color: 'var(--dim)' }}
              >
                {dir}
              </h2>
              {starts.length === 0 ? (
                <p
                  className="text-sm font-light"
                  style={{ color: 'var(--dim)' }}
                >
                  place blocks to create words
                </p>
              ) : (
                starts.map((s) => (
                  <div
                    key={s.num}
                    className={`clue-row flex gap-2 items-start cursor-pointer${
                      direction === dir && activeNum === s.num ? ' clue-active' : ''
                    }`}
                    onClick={() => handleClueClick(dir, s.num)}
                  >
                    <span
                      className="text-sm font-semibold min-w-[16px]"
                      style={{
                        color: 'var(--accent)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {s.num}
                    </span>
                    <textarea
                      rows={1}
                      placeholder="add clue…"
                      value={clues[dir][s.num] || ''}
                      onChange={(e) => {
                        setClues((prev) => ({
                          ...prev,
                          [dir]: { ...prev[dir], [s.num]: e.target.value },
                        }))
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected([s.row, s.col])
                        setDirection(dir)
                        if (mode !== 'letters') setMode('letters')
                      }}
                      className="clue-input flex-1 bg-transparent text-sm outline-none min-w-0 resize-none leading-snug"
                      style={{ color: 'var(--fg)', overflow: 'hidden' }}
                    />
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-[380px] flex flex-col gap-1.5">
        <button
          onClick={handleShare}
          className="btn-accent w-full py-3.5 rounded-xl text-[15px] font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          share puzzle
        </button>
        {error && (
          <p
            key={errorKey}
            className="error-shake text-center text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleClear}
          className="btn-ghost w-full py-2.5 text-[13px] font-medium"
          style={{ color: confirmClear ? 'var(--accent)' : 'var(--dim)', background: 'none', border: 'none' }}
        >
          {confirmClear ? 'tap again to clear' : 'clear grid'}
        </button>
      </div>

      {shareUrl && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => {
            setShareUrl(null)
            setCopied(false)
          }}
        >
          <div
            className="modal-content w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4"
            style={{ background: 'var(--surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">puzzle ready</h2>
            <div className="p-4 rounded-xl" style={{ background: '#fff' }}>
              <QRCodeSVG value={shareUrl} size={200} />
            </div>
            <input
              readOnly
              value={shareUrl}
              className="w-full bg-transparent text-xs text-center truncate outline-none"
              style={{ color: 'var(--dim)' }}
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className="btn-accent w-full py-3 rounded-xl text-[15px] font-semibold"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {copied === true ? 'copied!' : copied === 'fallback' ? 'long-press link to copy' : 'copy link'}
            </button>
            <button
              onClick={() => {
                setShareUrl(null)
                setCopied(false)
              }}
              className="btn-ghost text-[13px] font-medium"
              style={{ color: 'var(--dim)', background: 'none', border: 'none' }}
            >
              close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
