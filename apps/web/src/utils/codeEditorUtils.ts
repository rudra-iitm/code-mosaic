import axios from "axios";

export const handleCodeRun = async (activeFile: string | null, content: string) => {
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
    // Uncomment the following line when WebSocket is properly set up
    // ws.send(JSON.stringify({ projectSlug, command: 'npm run dev' }));
  } catch (error) {
    console.error('Error saving file:', error);
  }
};

