import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { templates } from "@/utils/templates";
import websocket from "@/hooks/useSocket";

export function useCodeEditor() {
  const [listObjects, setListObjects] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const location = useLocation();
  const { projectSlug } = useParams();
  const queryParams = new URLSearchParams(location.search);
  const techRef = useRef(queryParams.get('tech'));
  const projectSlugRef = useRef(projectSlug);

  useEffect(() => {
    const handleFileTreeEvent = (event: MessageEvent) => {
      let data: any;

      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            data = JSON.parse(reader.result as string);
            if (data.cmd === 'file-tree') {
              setListObjects(data.content || []);
            }
          } catch (error) {
            console.error("Failed to parse message:", error);
          }
        };
        reader.onerror = (err) => {
          console.error("Blob read failed:", err);
        };
        reader.readAsText(event.data);
      } else {
        try {
          data = JSON.parse(event.data);
          if (data.cmd === 'file-tree') {
            setListObjects(data.content || []);
          }
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      }
    };

    websocket.addListener(handleFileTreeEvent);

    return () => {
      websocket.removeListener(handleFileTreeEvent);
    };
  }, []);

  useEffect(() => {
    setContent(templates.filter((t) => t.name === techRef.current)[0].starterCode);
  }, []);

  return {
    listObjects,
    activeFile,
    setActiveFile,
    content,
    setContent,
    projectSlug,
    techRef,
  };
}

