import { Editor } from "@monaco-editor/react";
import { Resizable } from "re-resizable";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Button } from "@/components/ui/button.tsx";
import { File, Folder, Play, Settings, Plus } from "lucide-react";
import { TreeItem } from "@/components/file-tree.tsx";
import { useLocation, useParams } from "react-router-dom";
import Terminal from "@/components/terminal";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

export function CodeEditor() {

  const [content, setContent] = useState<string>(`// You are editing:`);
  const [listProjectFiles, setListProjectFiles] = useState<string[]>([]);
  const { projectSlug } = useParams();
  const location = useLocation();


  const queryParams = new URLSearchParams(location.search);

  const handleFileSelect = (fileName: string) => {
    console.log("Selected file:", fileName);
  };

  const techRef = useRef(queryParams.get('tech'));
  const projectSlugRef = useRef(projectSlug);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await axios.post(`http://localhost:3000/api/projectInit`, {
          tech: techRef.current,
          projectSlug: projectSlugRef.current
        });
        console.log(data);
      } catch (error) {
        console.error("Error fetching project files:", error);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    const fetchProjectFiles = async () => {
      try {
        const { data } = await axios.get(`http://localhost:3000/api/listObjects`, {
          params: {
            prefix: `workdir/${projectSlug}`
          }
        });
        console.log(data);
        setListProjectFiles(data);
      } catch (error) {
        console.error("Error fetching project files:", error);
      }
    };
    fetchProjectFiles();
  }, [projectSlug]);

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
              <FileTree onFileSelect={handleFileSelect} activeFile={"app.tsx"} />
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
            >
              <Play className="h-4 w-4 mr-2" /> Run (Docker)
            </Button>
            <Button
              variant="ghost"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" /> Run (SSH)
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue={content}
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

function FileTree({ onFileSelect, activeFile }: { onFileSelect: (fileName: string) => void; activeFile?: string }) {
  return (
    <div className="space-y-1">
      <TreeItem icon={Folder} label="src" defaultExpanded>
        <TreeItem
          icon={File}
          label="app.tsx"
          onSelect={() => onFileSelect("app.tsx")}
          active={activeFile === "app.tsx"}
        />
        <TreeItem
          icon={File}
          label="index.tsx"
          onSelect={() => onFileSelect("index.tsx")}
          active={activeFile === "index.tsx"}
        />
        <TreeItem icon={Folder} label="components">
          <TreeItem
            icon={File}
            label="button.tsx"
            onSelect={() => onFileSelect("button.tsx")}
            active={activeFile === "button.tsx"}
          />
          <TreeItem
            icon={File}
            label="card.tsx"
            onSelect={() => onFileSelect("card.tsx")}
            active={activeFile === "card.tsx"}
          />
        </TreeItem>
      </TreeItem>
      <TreeItem icon={Folder} label="public">
        <TreeItem
          icon={File}
          label="favicon.ico"
          onSelect={() => onFileSelect("favicon.ico")}
          active={activeFile === "favicon.ico"}
        />
      </TreeItem>
      <TreeItem
        icon={File}
        label="package.json"
        onSelect={() => onFileSelect("package.json")}
        active={activeFile === "package.json"}
      />
      <TreeItem
        icon={File}
        label="tsconfig.json"
        onSelect={() => onFileSelect("tsconfig.json")}
        active={activeFile === "tsconfig.json"}
      />
    </div>
  );
}
