
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CodeEditor } from './pages/codeEditor'
import { Projects } from './pages/projects';

function App() {

  return (
    <BrowserRouter>
    <Routes>
        <Route index element={<Projects />} />
        <Route path="/code-editor/:projectSlug" element={<CodeEditor />} />
    </Routes>
  </BrowserRouter>
  )
}

export default App
