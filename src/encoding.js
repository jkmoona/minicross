function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function numberGrid(grid) {
  let num = 1
  const numbers = Array.from({ length: 5 }, () => Array(5).fill(0))
  const acrossStarts = []
  const downStarts = []

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].black) continue

      const startsAcross =
        (c === 0 || grid[r][c - 1].black) && c < 4 && !grid[r][c + 1].black
      const startsDown =
        (r === 0 || grid[r - 1][c].black) && r < 4 && !grid[r + 1][c].black

      if (startsAcross || startsDown) {
        numbers[r][c] = num
        if (startsAcross) acrossStarts.push({ num, row: r, col: c })
        if (startsDown) downStarts.push({ num, row: r, col: c })
        num++
      }
    }
  }

  return { numbers, acrossStarts, downStarts }
}

export function encodePuzzle(grid, acrossStarts, downStarts, clues) {
  const g = grid
    .flat()
    .map((c) => (c.black ? '.' : c.letter || '_'))
    .join('')
  const a = acrossStarts.map((s) => clues.across[s.num] || '')
  const d = downStarts.map((s) => clues.down[s.num] || '')
  return toBase64Url(JSON.stringify([g, a, d]))
}

export function decodePuzzle(hash) {
  const raw = fromBase64Url(hash)
  const [gridStr, acrossTexts, downTexts] = JSON.parse(raw)
  if (typeof gridStr !== 'string' || gridStr.length !== 25 || !/^[A-Z._]{25}$/.test(gridStr)) {
    throw new Error('invalid puzzle data')
  }

  const grid = []
  for (let r = 0; r < 5; r++) {
    const row = []
    for (let c = 0; c < 5; c++) {
      const ch = gridStr[r * 5 + c]
      row.push({
        black: ch === '.',
        letter: ch !== '.' && ch !== '_' ? ch : '',
      })
    }
    grid.push(row)
  }

  const { numbers, acrossStarts, downStarts } = numberGrid(grid)

  const acrossClues = acrossStarts.map((s, i) => ({
    num: s.num,
    text: acrossTexts[i] || '',
    row: s.row,
    col: s.col,
  }))
  const downClues = downStarts.map((s, i) => ({
    num: s.num,
    text: downTexts[i] || '',
    row: s.row,
    col: s.col,
  }))

  return { grid, numbers, acrossStarts, downStarts, acrossClues, downClues }
}
