
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CodeEditor } from './pages/codeEditor'

function App() {

  return (
    <BrowserRouter>
    <Routes>
        <Route index element={<CodeEditor />} />
        <Route path="/code-editor/:projectSlug" element={<CodeEditor />} />
    </Routes>
  </BrowserRouter>
  )
}

export default App
