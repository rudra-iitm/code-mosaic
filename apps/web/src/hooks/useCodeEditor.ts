import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import axios from "axios";
import { templates } from "@/utils/templates";

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
        await axios.post(`http://localhost:3000/api/projectInit`, {
          tech: techRef.current,
          projectSlug: projectSlugRef.current
        });
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
        if (!data || data.length === 0) {
          setTimeout(fetchProjectFiles, 5000);
          return;
        }
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

