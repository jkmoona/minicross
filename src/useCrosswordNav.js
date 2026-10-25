import { useState, useMemo } from 'react'

export function setCell(grid, r, c, letter) {
  return grid.map((row, ri) =>
    ri !== r ? row : row.map((cell, ci) =>
      ci !== c ? cell : { ...cell, letter }
    )
  )
}

export default function useCrosswordNav({
  navGrid, editGrid, setEditGrid,
  acrossStarts, downStarts,
  disabled, inputRef,
  initialSelected = null,
  initialDirection = 'across',
}) {
  const [selected, setSelected] = useState(initialSelected)
  const [direction, setDirection] = useState(initialDirection)

  const blackMask = useMemo(
    () => navGrid.flat().map(c => c.black ? '1' : '0').join(''),
    [navGrid]
  )

  function hasAcross(r, c) {
    return !navGrid[r][c].black &&
      ((c > 0 && !navGrid[r][c - 1].black) || (c < 4 && !navGrid[r][c + 1].black))
  }

  function hasDown(r, c) {
    return !navGrid[r][c].black &&
      ((r > 0 && !navGrid[r - 1][c].black) || (r < 4 && !navGrid[r + 1][c].black))
  }

  function advanceSel(r, c) {
    if (direction === 'across') {
      for (let nc = c + 1; nc < 5; nc++)
        if (!navGrid[r][nc].black) return setSelected([r, nc])
    } else {
      for (let nr = r + 1; nr < 5; nr++)
        if (!navGrid[nr][c].black) return setSelected([nr, c])
    }
  }

  const highlightedCells = useMemo(() => {
    if (disabled || !selected) return []
    const [r, c] = selected
    const isBlack = (row, col) => blackMask[row * 5 + col] === '1'
    if (isBlack(r, c)) return []
    const cells = []
    if (direction === 'across') {
      let sc = c
      while (sc > 0 && !isBlack(r, sc - 1)) sc--
      for (let cc = sc; cc < 5 && !isBlack(r, cc); cc++) cells.push([r, cc])
    } else {
      let sr = r
      while (sr > 0 && !isBlack(sr - 1, c)) sr--
      for (let rr = sr; rr < 5 && !isBlack(rr, c); rr++) cells.push([rr, c])
    }
    return cells
  }, [disabled, selected, direction, blackMask])

  function getActiveClueNum(dir) {
    if (!selected || disabled) return null
    const [r, c] = selected
    if (navGrid[r][c].black) return null
    if (dir === 'across') {
      let sc = c
      while (sc > 0 && !navGrid[r][sc - 1].black) sc--
      return acrossStarts.find(s => s.row === r && s.col === sc)?.num ?? null
    }
    let sr = r
    while (sr > 0 && !navGrid[sr - 1][c].black) sr--
    return downStarts.find(s => s.row === sr && s.col === c)?.num ?? null
  }

  function handleCellClick(r, c) {
    if (navGrid[r][c].black || disabled) return
    inputRef.current?.focus()
    if (selected && selected[0] === r && selected[1] === c) {
      const a = hasAcross(r, c), d = hasDown(r, c)
      if (a && d) setDirection(prev => prev === 'across' ? 'down' : 'across')
      else if (d) setDirection('down')
      else setDirection('across')
    } else {
      setSelected([r, c])
      const a = hasAcross(r, c), d = hasDown(r, c)
      if (a && !d) setDirection('across')
      else if (d && !a) setDirection('down')
    }
  }

  function typeLetter(letter) {
    if (!selected || disabled) return
    const [r, c] = selected
    if (navGrid[r][c].black) return
    setEditGrid(prev => setCell(prev, r, c, letter))
    advanceSel(r, c)
  }

  function doBackspace() {
    if (!selected || disabled) return
    const [r, c] = selected
    if (editGrid[r][c].letter) {
      setEditGrid(prev => setCell(prev, r, c, ''))
    } else if (direction === 'across') {
      for (let nc = c - 1; nc >= 0; nc--) {
        if (!navGrid[r][nc].black) {
          setSelected([r, nc])
          setEditGrid(prev => setCell(prev, r, nc, ''))
          break
        }
      }
    } else {
      for (let nr = r - 1; nr >= 0; nr--) {
        if (!navGrid[nr][c].black) {
          setSelected([nr, c])
          setEditGrid(prev => setCell(prev, nr, c, ''))
          break
        }
      }
    }
  }

  function handleKeyDown(e) {
    if (!selected || disabled) return
    if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== inputRef.current) return
    const [r, c] = selected

    if (e.key === 'Backspace') {
      e.preventDefault()
      doBackspace()
      return
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (direction === 'across') { setDirection('down'); return }
      if (e.key === 'ArrowUp') {
        for (let nr = r - 1; nr >= 0; nr--)
          if (!navGrid[nr][c].black) { setSelected([nr, c]); break }
      } else {
        for (let nr = r + 1; nr < 5; nr++)
          if (!navGrid[nr][c].black) { setSelected([nr, c]); break }
      }
      return
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (direction === 'down') { setDirection('across'); return }
      if (e.key === 'ArrowLeft') {
        for (let nc = c - 1; nc >= 0; nc--)
          if (!navGrid[r][nc].black) { setSelected([r, nc]); break }
      } else {
        for (let nc = c + 1; nc < 5; nc++)
          if (!navGrid[r][nc].black) { setSelected([r, nc]); break }
      }
      return
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      typeLetter(e.key.toUpperCase())
    }
  }

  return {
    selected, setSelected,
    direction, setDirection,
    highlightedCells,
    getActiveClueNum,
    handleCellClick,
    handleKeyDown,
    typeLetter,
    doBackspace,
  }
}
