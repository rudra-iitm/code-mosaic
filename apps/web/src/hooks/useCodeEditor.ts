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
          data = (new Uint8Array(reader.result as ArrayBuffer));
        };
        reader.readAsArrayBuffer(event.data);
      } else if (typeof event.data === 'string') {
        try {
          const jsonData = JSON.parse(event.data);
          if (jsonData.error) {
            console.error("Failed to parse message:", jsonData.error);
          } else if (jsonData.cmd ==='file-tree') {
            data = jsonData.content;
            setListObjects(data);
          }
        } catch(error) {
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

  useEffect(() => {
    const getFile = (event: MessageEvent) => {
      let data: any;
      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          data = (new Uint8Array(reader.result as ArrayBuffer));
        };
        reader.readAsArrayBuffer(event.data);
      } else if (typeof event.data === 'string') {
        try {
          const jsonData = JSON.parse(event.data);
          if (jsonData.error) {
            console.error("Failed to parse message:", jsonData.error);
          } else if (jsonData.cmd ==='get-file') {
            data = jsonData.content;
            console.log('File content:', data);
            setContent(data);
          }
        } catch(error) {
          console.error("Failed to parse message:", error);
        }
      }
    };

    websocket.addListener(getFile);

    return () => {
      websocket.removeListener(getFile);
    };
  }, [activeFile]);

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

