import websocket from "@/hooks/useSocket";

export const saveFile = async (projectSlug: string, activeFile: string | null, content: string) => {
  if (!activeFile || !content) {
    console.error('Filename or content is missing!');
    return;
  }

  try {
    console.log('Content:', content);
    websocket.send(JSON.stringify({ command: 'save-file', projectSlug,  filepath: activeFile, content }));
    console.log(`File saved successfully: ${activeFile}`);
  } catch (error) {
    console.error('Error saving file:', error);
  }
};
