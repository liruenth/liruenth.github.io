import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './App.css'
import Sidebar from './Sidebar'
import ScoreSheet from './pages/score_sheets/ScoreSheet'
import Stats from './pages/Stats'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
