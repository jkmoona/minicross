function bytesToBase64Url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function compress(text) {
  const stream = new Blob([text]).stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decompress(bytes) {
  const stream = new Blob([bytes]).stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
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

export async function encodePuzzle(grid, acrossStarts, downStarts, clues) {
  const g = grid
    .flat()
    .map((c) => (c.black ? '.' : c.letter || '_'))
    .join('')
  const a = acrossStarts.map((s) => clues.across[s.num] || '')
  const d = downStarts.map((s) => clues.down[s.num] || '')
  const text = g + '\n' + a.join('\n') + '\n\n' + d.join('\n')
  const plain = bytesToBase64Url(new TextEncoder().encode(text))

  try {
    const compressed = await compress(text)
    const payload = new Uint8Array(1 + compressed.length)
    payload[0] = 1
    payload.set(compressed, 1)
    const short = bytesToBase64Url(payload)
    return short.length < plain.length ? short : plain
  } catch {
    return plain
  }
}

function parseRaw(raw) {
  let gridStr, acrossTexts, downTexts
  if (raw[0] === '[') {
    ;[gridStr, acrossTexts, downTexts] = JSON.parse(raw)
  } else {
    const [acrossPart, downPart] = raw.slice(26).split('\n\n', 2)
    gridStr = raw.slice(0, 25)
    acrossTexts = acrossPart ? acrossPart.split('\n') : []
    downTexts = downPart ? downPart.split('\n') : []
  }

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

export async function decodePuzzle(hash) {
  const bytes = base64UrlToBytes(hash)

  if (bytes[0] === 1) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('browser-outdated')
    }
    const raw = await decompress(bytes.slice(1))
    return parseRaw(raw)
  }

  return parseRaw(new TextDecoder().decode(bytes))
}
