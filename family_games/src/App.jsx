import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';

import './App.css'
import ScoreSheet from './pages/score_sheets/ScoreSheet'
import Stats from './pages/Stats'

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Score Sheet</Link>
        <Link to="/stats">Stats</Link>
      </nav>

      <Routes>
        <Route path="/" element={<ScoreSheet />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
