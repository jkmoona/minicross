import { useState, useRef, useMemo, useEffect } from 'react'
import Grid from './Grid'
import Keyboard from './Keyboard'
import Layout from './Layout'
import useCrosswordNav from './useCrosswordNav'
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
  const draftRef = useRef(undefined)
  if (draftRef.current === undefined) draftRef.current = loadDraft()
  const draft = draftRef.current

  const [grid, setGrid] = useState(() => draft?.grid ?? emptyGrid())
  const [mode, setMode] = useState(() => draft?.mode ?? 'blocks')
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
    disabled: mode !== 'letters',
    inputRef,
    initialSelected: () => {
      const sel = draft?.selected
      if (!sel || draft?.grid?.[sel[0]]?.[sel[1]]?.black) return null
      return sel
    },
    initialDirection: () => draft?.direction ?? 'across',
  })

  function handleCellClick(r, c) {
    if (mode === 'blocks') {
      setGrid(prev =>
        prev.map((row, ri) =>
          ri !== r ? row : row.map((cell, ci) =>
            ci !== c ? cell : { black: !cell.black, letter: '' }
          )
        )
      )
      return
    }
    nav.handleCellClick(r, c)
  }

  function handleClueClick(dir, num) {
    setMode('letters')
    const starts = dir === 'across' ? acrossStarts : downStarts
    const s = starts.find(x => x.num === num)
    if (s) {
      nav.setSelected([s.row, s.col])
      nav.setDirection(dir)
    }
  }

  function switchToLetters() {
    setMode('letters')
    if (!nav.selected) {
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++)
          if (!grid[r][c].black) { nav.setSelected([r, c]); return }
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
    const missingAcross = acrossStarts.some(s => !clues.across[s.num]?.trim())
    const missingDown = downStarts.some(s => !clues.down[s.num]?.trim())
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
            background: mode === 'blocks' ? 'var(--cell)' : 'transparent',
            color: mode === 'blocks' ? 'var(--fg)' : 'var(--dim)',
          }}
          onClick={() => {
            setMode('blocks')
            nav.setSelected(null)
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
          selected={mode === 'letters' ? nav.selected : null}
          highlightedCells={nav.highlightedCells}
          onCellClick={handleCellClick}
        />
      </div>

      {mode === 'letters' && nav.selected && (
        <div className="mb-5">
          <Keyboard onKey={nav.typeLetter} onBackspace={nav.doBackspace} />
        </div>
      )}

      {!grid.some(row => row.some(cell => cell.black || cell.letter)) && mode === 'blocks' && (
        <p className="text-xs font-light mb-5" style={{ color: 'var(--dim)' }}>
          tap cells to place blocks
        </p>
      )}

      <div className="w-full max-w-[380px] grid grid-cols-2 gap-3 mb-7 min-w-0">
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
                      onClick={e => {
                        e.stopPropagation()
                        nav.setSelected([s.row, s.col])
                        nav.setDirection(dir)
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
