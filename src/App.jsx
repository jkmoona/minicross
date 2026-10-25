import { useState, useEffect, Component } from 'react'
import Create from './Create'
import Solve from './Solve'
import { decodePuzzle } from './encoding'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4"
          style={{ padding: '24px' }}
        >
          <p className="text-lg font-semibold">something went wrong</p>
          <a
            href="/"
            className="text-sm font-medium no-underline"
            style={{ color: 'var(--accent)' }}
          >
            back to minicross
          </a>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [route, setRoute] = useState({ mode: 'loading' })

  useEffect(() => {
    function check() {
      const hash = location.hash.slice(1)
      if (hash) {
        decodePuzzle(hash).then(
          puzzle => setRoute({ mode: 'solve', puzzle }),
          err => setRoute({
            mode: 'invalid',
            outdated: err?.message === 'browser-outdated',
          })
        )
      } else {
        setRoute({ mode: 'create' })
      }
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  if (route.mode === 'loading') return null

  return (
    <ErrorBoundary>
      {route.mode === 'solve' && <Solve puzzle={route.puzzle} />}
      {route.mode === 'invalid' && (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4"
          style={{ padding: '24px' }}
        >
          <h1
            className="text-xl font-semibold"
            style={{ letterSpacing: '-0.02em' }}
          >
            minicross
          </h1>
          <p className="text-sm" style={{ color: 'var(--dim)' }}>
            {route.outdated
              ? 'please update your browser to open this puzzle'
              : 'this puzzle link is invalid or expired'}
          </p>
          <a
            href="/"
            className="text-sm font-medium no-underline"
            style={{ color: 'var(--accent)' }}
          >
            create your own
          </a>
        </div>
      )}
      {route.mode === 'create' && <Create />}
    </ErrorBoundary>
  )
}
