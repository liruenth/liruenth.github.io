import { useState } from 'react'
// Hash rather than browser history: the app is served as a static file from
// GitHub Pages, which has no rewrite rule to fall back on, so a real request
// for /score-sheet finds no file and 404s. Nothing after the # reaches the
// server, so index.html is always what gets served.
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import './App.css'
import Sidebar from './Sidebar'
import ScoreSheet from './pages/score_sheets/ScoreSheet'
import Stats from './pages/Stats'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <HashRouter>
      <Sidebar
        open={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => setMenuOpen(false)}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/score-sheet" replace />} />
        <Route path="/score-sheet" element={<ScoreSheet />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </HashRouter>
  )
}

export default App
