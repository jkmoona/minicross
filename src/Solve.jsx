import { useState, useRef, useEffect, useMemo } from 'react'
import Grid from './Grid'
import Keyboard from './Keyboard'
import Layout from './Layout'
import useCrosswordNav from './useCrosswordNav'
import { addSolved } from './history'

export default function Solve({ puzzle }) {
  const { grid: solution, numbers, acrossClues, downClues, acrossStarts, downStarts } =
    puzzle

  const solveKey = 'minicross-' + location.hash.slice(1)

  function freshGrid() {
    return solution.map(row =>
      row.map(cell => ({ black: cell.black, letter: '' }))
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
  const [revealed, setRevealed] = useState(false)
  const inputRef = useRef(null)

  const solved = useMemo(() =>
    solution.every((row, r) =>
      row.every((cell, c) =>
        cell.black || userGrid[r][c].letter === cell.letter
      )
    ),
    [userGrid, solution]
  )

  const nav = useCrosswordNav({
    navGrid: solution,
    editGrid: userGrid,
    setEditGrid: setUserGrid,
    acrossStarts,
    downStarts,
    disabled: revealed || solved,
    inputRef,
    initialSelected: () => {
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++)
          if (!solution[r][c].black) return [r, c]
      return null
    },
  })

  const displayGrid = useMemo(() => {
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
  }, [revealed, userGrid, solution])

  function handleClueClick(dir, num) {
    if (revealed) return
    const starts = dir === 'across' ? acrossStarts : downStarts
    const s = starts.find(x => x.num === num)
    if (s) {
      nav.setSelected([s.row, s.col])
      nav.setDirection(dir)
    }
  }

  function handleReset() {
    setUserGrid(freshGrid())
    nav.setSelected(null)
    setRevealed(false)
    try { localStorage.removeItem(solveKey) } catch {}
  }

  useEffect(() => {
    try { localStorage.setItem(solveKey, JSON.stringify(userGrid)) } catch {}
  }, [userGrid, solveKey])

  useEffect(() => {
    if (solved) {
      const firstClue = acrossClues[0]?.text || 'untitled'
      addSolved(location.hash.slice(1), firstClue)
    }
  }, [solved, acrossClues])

  return (
    <Layout onKeyDown={nav.handleKeyDown} inputRef={inputRef}>
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
          grid={displayGrid}
          numbers={numbers}
          selected={!revealed ? nav.selected : null}
          highlightedCells={nav.highlightedCells}
          onCellClick={nav.handleCellClick}
          showCursor={!revealed}
        />
      </div>

      {!revealed && nav.selected && (
        <div className="mb-5">
          <Keyboard onKey={nav.typeLetter} onBackspace={nav.doBackspace} />
        </div>
      )}

      <div className="w-full max-w-[380px] grid grid-cols-2 gap-3 mb-7 min-w-0">
        {[
          { dir: 'across', items: acrossClues },
          { dir: 'down', items: downClues },
        ].map(({ dir, items }) => {
          const activeNum = nav.getActiveClueNum(dir)
          return (
            <div key={dir} className="min-w-0">
              <h2
                className="text-[11px] font-medium uppercase mb-2.5"
                style={{ letterSpacing: '0.12em', color: 'var(--dim)' }}
              >
                {dir}
              </h2>
              {items.map(clue => (
                <div
                  key={clue.num}
                  className={`clue-row flex gap-2 items-baseline cursor-pointer${
                    nav.direction === dir && activeNum === clue.num ? ' clue-active' : ''
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
          onClick={() => setRevealed(r => !r)}
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
    </Layout>
  )
}
