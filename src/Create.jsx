import { useState, useRef, useMemo, useEffect } from 'react'
import Grid from './Grid'
import Keyboard from './Keyboard'
import Layout from './Layout'
import useCrosswordNav from './useCrosswordNav'
import { encodePuzzle, numberGrid } from './encoding'
import { QRCodeSVG } from 'qrcode.react'
import { addCreated, getHistory } from './history'

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

function History() {
  const entries = getHistory()
  if (entries.length === 0) return null
  const base = location.origin + location.pathname
  return (
    <div className="w-full max-w-[380px] mt-8 min-w-0">
      <h2
        className="text-[11px] font-medium uppercase mb-3"
        style={{ letterSpacing: '0.12em', color: 'var(--dim)' }}
      >
        my puzzles
      </h2>
      <div className="flex flex-col gap-1">
        {entries.map(e => (
          <a
            key={e.hash + e.type}
            href={`${base}#${e.hash}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline"
            style={{ background: 'var(--surface)', color: 'var(--fg)' }}
          >
            <span
              className="text-[10px] font-medium uppercase shrink-0"
              style={{
                color: e.type === 'solved' ? 'var(--correct)' : 'var(--accent)',
                letterSpacing: '0.05em',
              }}
            >
              {e.type === 'solved' ? 'solved' : 'created'}
            </span>
            <span className="text-sm truncate min-w-0">{e.label}</span>
            <span
              className="text-[11px] ml-auto shrink-0"
              style={{ color: 'var(--dim)' }}
            >
              {new Date(e.ts).toLocaleDateString()}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default function Create() {
  const draftRef = useRef(undefined)
  if (draftRef.current === undefined) draftRef.current = loadDraft()
  const draft = draftRef.current

  const [grid, setGrid] = useState(() => draft?.grid ?? emptyGrid())
  const [mode, setMode] = useState(() => {
    const m = draft?.mode
    if (m === 'blocks' || m === 'letters') return 'board'
    return m ?? 'board'
  })
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

  const nav = useCrosswordNav({
    navGrid: grid,
    editGrid: grid,
    setEditGrid: setGrid,
    acrossStarts,
    downStarts,
    disabled: mode !== 'board',
    inputRef,
    initialSelected: () => {
      const sel = draft?.selected
      if (!sel || draft?.grid?.[sel[0]]?.[sel[1]]?.black) return null
      return sel
    },
    initialDirection: () => draft?.direction ?? 'across',
  })

  function handleLongPress(r, c) {
    setGrid(prev =>
      prev.map((row, ri) =>
        ri !== r ? row : row.map((cell, ci) =>
          ci !== c ? cell : { black: !cell.black, letter: '' }
        )
      )
    )
    if (nav.selected && nav.selected[0] === r && nav.selected[1] === c) {
      nav.setSelected(null)
    }
  }

  function handleClueClick(dir, num) {
    setMode('board')
    const starts = dir === 'across' ? acrossStarts : downStarts
    const s = starts.find(x => x.num === num)
    if (s) {
      nav.setSelected([s.row, s.col])
      nav.setDirection(dir)
    }
  }

  function switchToBoard() {
    setMode('board')
    if (!nav.selected) {
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++)
          if (!grid[r][c].black) { nav.setSelected([r, c]); return }
    }
  }

  async function handleShare() {
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
    const missingAcross = acrossStarts.some(s => !clues.across[s.num]?.trim())
    const missingDown = downStarts.some(s => !clues.down[s.num]?.trim())
    if (missingAcross || missingDown) {
      setError('fill all clues')
      setErrorKey(k => k + 1)
      return
    }
    const encoded = await encodePuzzle(grid, acrossStarts, downStarts, clues)
    const firstClue = acrossStarts[0] ? clues.across[acrossStarts[0].num]?.trim() : ''
    addCreated(encoded, firstClue || 'untitled')
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
    nav.setSelected(null)
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
    saveDraft({ grid, mode, selected: nav.selected, direction: nav.direction, clues })
  }, [grid, mode, nav.selected, nav.direction, clues])

  useEffect(() => {
    if (!shareUrl) return
    function onKey(e) {
      if (e.key === 'Escape') { setShareUrl(null); setCopied(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shareUrl])

  return (
    <Layout onKeyDown={nav.handleKeyDown} inputRef={inputRef}>
      <div
        className="flex gap-1 p-1 rounded-lg mb-7"
        style={{ background: 'var(--surface)' }}
      >
        <button
          className="mode-btn px-4 py-1.5 rounded-md text-xs font-medium uppercase"
          style={{
            letterSpacing: '0.1em',
            background: mode === 'board' ? 'var(--cell)' : 'transparent',
            color: mode === 'board' ? 'var(--fg)' : 'var(--dim)',
          }}
          onClick={switchToBoard}
        >
          board
        </button>
        <button
          className="mode-btn px-4 py-1.5 rounded-md text-xs font-medium uppercase"
          style={{
            letterSpacing: '0.1em',
            background: mode === 'clues' ? 'var(--cell)' : 'transparent',
            color: mode === 'clues' ? 'var(--fg)' : 'var(--dim)',
          }}
          onClick={() => setMode('clues')}
        >
          clues
        </button>
      </div>

      {mode === 'board' && (
        <>
          <div className="relative mb-7">
            <Grid
              grid={grid}
              numbers={numbers}
              selected={nav.selected}
              highlightedCells={nav.highlightedCells}
              onCellClick={nav.handleCellClick}
              onLongPress={handleLongPress}
            />
          </div>

          {nav.selected && (
            <div className="mb-5">
              <Keyboard onKey={nav.typeLetter} onBackspace={nav.doBackspace} />
            </div>
          )}

          {!grid.some(row => row.some(cell => cell.black || cell.letter)) && (
            <p className="text-xs font-light mb-5" style={{ color: 'var(--dim)' }}>
              hold a cell to place a block
            </p>
          )}
        </>
      )}

      {mode === 'clues' && (
        <div className="w-full max-w-[380px] grid grid-cols-2 gap-3 mb-5 min-w-0">
          {['across', 'down'].map(dir => {
            const starts = dir === 'across' ? acrossStarts : downStarts
            const activeNum = nav.getActiveClueNum(dir)
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
                  starts.map(s => (
                    <div
                      key={s.num}
                      className={`clue-row flex gap-2 items-start cursor-pointer${
                        nav.direction === dir && activeNum === s.num ? ' clue-active' : ''
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
                        onChange={e => {
                          setClues(prev => ({
                            ...prev,
                            [dir]: { ...prev[dir], [s.num]: e.target.value },
                          }))
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        onClick={e => e.stopPropagation()}
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
      )}

      {mode === 'clues' && (
        <div className="mb-7" style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}>
          <Grid
            grid={grid}
            numbers={numbers}
            selected={null}
            highlightedCells={[]}
            onCellClick={() => setMode('board')}
          />
        </div>
      )}

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

      <History />

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
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">puzzle ready</h2>
            <div className="p-4 rounded-xl" style={{ background: '#fff' }}>
              <QRCodeSVG value={shareUrl} size={200} level="M" />
            </div>
            <input
              readOnly
              value={shareUrl}
              className="w-full bg-transparent text-xs text-center truncate outline-none"
              style={{ color: 'var(--dim)' }}
              onClick={e => e.target.select()}
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
    </Layout>
  )
}
