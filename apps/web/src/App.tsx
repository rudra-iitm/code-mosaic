
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CodeEditor } from './pages/codeEditor'
import { Projects } from './pages/projects';
import websocket from "@/hooks/useSocket";
import { useEffect } from 'react';

function App() {

  useEffect(() => {
    websocket.connect('ws://localhost:8000');
    return () => {
      websocket.disconnect();
    };
  }, []);

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
