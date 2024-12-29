import { Editor } from "@monaco-editor/react";
import { Resizable } from "re-resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Play, Plus } from 'lucide-react';
import { useEffect } from "react";
import { FileTree } from "@/components/file-tree";
import { TerminalDrawer } from "@/components/terminalDrawer";
import { MiniBrowserDialog } from "@/components/miniBrowserDialog";
import { useCodeEditor } from "@/hooks/useCodeEditor";
import { handleCodeRun } from "@/utils/codeEditorUtils";
import websocket from "@/hooks/useSocket";

export function CodeEditor() {
  const {
    listObjects,
    activeFile,
    setActiveFile,
    content,
    setContent,
    projectSlug,
    techRef,
  } = useCodeEditor();

  const handleFileSelect = (fileName: string) => {
    setActiveFile(fileName);
  };
  
  useEffect(() => {
    websocket.send(JSON.stringify({ projectSlug, command: 'init' }));

    return () => {
      websocket.disconnect();
    };
  }, [projectSlug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleCodeRun(activeFile, content);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [content, activeFile]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Resizable
        defaultSize={{ width: 240, height: "100%" }}
        minWidth={200}
        maxWidth={400}
        enable={{ right: true }}
        className="border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
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
              <FileTree
                onFileSelect={handleFileSelect}
                activeFile={activeFile || ""}
                listObjects={listObjects}
              />
            </div>
          </ScrollArea>
        </div>
      </Resizable>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={() => handleCodeRun(activeFile, content)}>
              <Play className="h-4 w-4 mr-2" /> Run Code
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <MiniBrowserDialog />
            <TerminalDrawer projectSlug={projectSlug || ""} />
          </div>
        </div>
        <div className="flex-1 rounded-lg overflow-hidden shadow-md bg-[#1e1e1e]">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            language={techRef.current || "javascript"}
            defaultValue={content}
            value={content}
            theme="vs-dark"
            onChange={(value) => setContent(value || "")}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: '"Fira Code", monospace',
              lineNumbers: "on",
              padding: { top: 10, bottom: 10 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              overviewRulerBorder: false,
              smoothScrolling: true,
              cursorSmoothCaretAnimation: true,
              roundedSelection: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}

