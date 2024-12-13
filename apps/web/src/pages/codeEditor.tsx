import { Editor } from "@monaco-editor/react";
import { Resizable } from "re-resizable";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Play, Settings, Plus } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import Terminal from "@/components/terminal";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { templates } from "@/utils/templates";
import { FileTree } from "@/components/file-tree";

export function CodeEditor() {
  const [listObjects, setListObjects] = useState<string[]>([]);
  const { projectSlug } = useParams();
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const location = useLocation();
  const ws = new WebSocket('ws://localhost:8000');

  const queryParams = new URLSearchParams(location.search);

  const handleFileSelect = (fileName: string) => {
    setActiveFile(fileName);
  };

  const handleCodeRun = () => {
    const saveObject = async () => {
      if (!activeFile || !content) {
        console.error('Filename or content is missing!');
        return;
      }

      try {
        await axios.post('http://localhost:3000/api/saveObject', {
          filename: activeFile,
          content: content,
        });
        console.log(`File saved successfully: ${activeFile}`);
        // ws.send(JSON.stringify({ projectSlug, command: 'npm run dev' }));
      } catch (error) {
        console.error('Error saving file:', error);
      }
    };
    saveObject();
  };

  const techRef = useRef(queryParams.get('tech'));
  const projectSlugRef = useRef(projectSlug);

  const [content, setContent] = useState<string>(templates.filter((t) => t.name === techRef.current)[0].starterCode);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await axios.get(`http://localhost:3000/api/listObjects`, {
          params: {
            projectSlug: projectSlugRef.current
          }
        });
        if (data) {
          return;
        }
        const response = await axios.post(`http://localhost:3000/api/projectInit`, {
          tech: techRef.current,
          projectSlug: projectSlugRef.current
        });
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching project files:", error);
      }
    };
    init();
  }, []); 

  useEffect(() => {
    const fetchProjectFiles = async () => {
      try {
        const { data } = await axios.get(`http://localhost:3000/api/listObjects`, {
          params: {
            projectSlug: projectSlugRef.current
          }
        });
        setListObjects(data);
      } catch (error) {
        console.error("Error fetching project files:", error);
      }
    };
    fetchProjectFiles();
  }, []);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (!activeFile) {
        console.warn('No active file selected.');
        return;
      }

      try {
        console.log(`Fetching content for file: ${activeFile}`);
        const { data } = await axios.get('http://localhost:3000/api/getObject', {
          params: { filename: activeFile },
          responseType: 'text',
        });
        setContent(data);
      } catch (error) {
        console.error("Error fetching file content:", error);
      }
    };

    fetchFileContent();
  }, [activeFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleCodeRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, activeFile]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Left Panel - File Structure */}
      <Resizable
        defaultSize={{ width: 240, height: "100%" }}
        minWidth={200}
        maxWidth={400}
        enable={{ right: true }}
        className="border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 font-medium flex items-center justify-between">
            <span>Project Files</span>
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              <FileTree onFileSelect={handleFileSelect} activeFile={activeFile || ''} listObjects={listObjects} />
            </div>
          </ScrollArea>
        </div>
      </Resizable>

      {/* Middle Panel - Code Editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCodeRun}
            >
              <Play className="h-4 w-4 mr-2" /> Run Code
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          language={techRef.current || 'javascript'}
          defaultValue={content}
          value={content}
          theme="vs-dark"
          onChange={(value) => setContent(value || "")}
        />
      </div>

      {/* Right Panel - Terminal/Output */}
      <Resizable
        defaultSize={{ width: 300, height: "100%" }}
        minWidth={200}
        maxWidth={500}
        enable={{ left: true }}
        className="border-l border-gray-200 dark:border-gray-700"
      >
        <div className="flex h-full flex-col">
          <Terminal
            projectSlug={projectSlug || ''}
          />
        </div>
      </Resizable>
    </div>
  );
}
