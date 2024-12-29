import WebSocket, { WebSocketServer } from 'ws';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import path from 'path';
import DockerAPI from './DockerAPI';

class WebSocketHandler {
  private wss: WebSocketServer;
  private currentContainer: string | null = null;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.init();
  }

  private init() {
    this.wss.on('listening', this.onListening);
    this.wss.on('connection', this.onConnection);
  }

  private onListening = () => {
    console.log(`🐳 WebSocket server started and listening on port ${this.wss.options.port}`);
  }

  private onConnection = (ws: WebSocket) => {
    console.log('New client connected!');

    ws.on('message', (data: WebSocket.Data) => this.handleMessage(ws, data));
    ws.on('close', this.onClose);
    ws.on('error', this.onError);
  }

  private handleMessage = async (ws: WebSocket, data: WebSocket.Data) => {
    try {
      const jsonData = JSON.parse(data.toString());
      const { projectSlug, command, filepath, content } = jsonData;

      if (projectSlug && command) {
        const encodedProjectSlug = encodeURIComponent(projectSlug);

        if (command === 'init') {
          await this.initializeContainer(ws, projectSlug, encodedProjectSlug);
        } else if (command === 'kill') {
          await this.killContainer(ws, projectSlug);
        } else if (filepath && command === 'get-file') {
           await DockerAPI.readFile(ws, projectSlug, filepath);
        } else if (filepath && command === 'save-file') {
           await DockerAPI.writeFile(projectSlug, filepath, content);
        }
      } else {
        console.error('Invalid projectSlug or command.');
        ws.send(JSON.stringify({ error: 'Invalid projectSlug or command.' }));
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        await this.handleNonJsonMessage(data);
      } else {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ error: 'Error processing message.' }));
      }
    }
  }

  private initializeContainer = async (ws: WebSocket, projectSlug: string, encodedProjectSlug: string) => {
    console.log(`Initializing container for: ${projectSlug}`);
    const doesContainerExist = await DockerAPI.retryContainerCheck(encodedProjectSlug);
    if (!doesContainerExist) {
      await DockerAPI.pullAndCreateContainer(projectSlug);
    }
    const containerExistsAfterRetries = await DockerAPI.retryContainerCheck(encodedProjectSlug);
    if (!containerExistsAfterRetries) {
      console.error(`Container ${encodedProjectSlug} does not exist after retries.`);
      ws.send(JSON.stringify({ error: `Container ${projectSlug} does not exist.` }));
      return;
    }
    this.currentContainer = encodedProjectSlug;
    await DockerAPI.attachContainerToWebSocket(ws, projectSlug);
    // await this.fetchInitFolder(projectSlug);
  }

  private killContainer = async (ws: WebSocket, projectSlug: string) => {
    console.log(`Killing container: ${projectSlug}`);
    await DockerAPI.killContainer(projectSlug);
    ws.send(JSON.stringify({ message: `Container [${projectSlug}] killed.` }));
  }

  private handleNonJsonMessage = async (data: WebSocket.Data) => {
    if (this.currentContainer) {
      const container = DockerAPI.docker.getContainer(this.currentContainer);
      if (container) {
        const stream = await container.attach({
          stream: true,
          stdin: true,
          stdout: true,
          stderr: true,
        });
        stream.write(data.toString());
      }
    }
  }

  private onClose = () => {
    console.log('Client disconnected.');
    this.currentContainer = null;
  }

  private onError = (error: Error) => {
    console.error('WebSocket error:', error);
  }

  private fetchInitFolder = async (projectSlug: string): Promise<void> => {
    console.log(`Fetching initial folder for project: ${projectSlug}`);
    let retryCount = 0;
    const maxRetries = 5;

    const fetchFiles = async () => {
      try {
        const { data } = await axios.get(`http://localhost:3000/api/listObjects`, {
          params: { projectSlug }
        });

        if (!data || data.length === 0) {
          console.log('No files returned, retrying...');
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(fetchFiles, 5000);
          } else {
            console.error('Max retries reached. Exiting.');
          }
          return;
        }

        for (const { Key } of data) {
          const slicedKey = Key.split('/').slice(2).join('/');
          const folderPath = path.dirname(slicedKey);

          await fsPromises.mkdir(path.join(__dirname, 'tmp', folderPath), { recursive: true });

          const filePath = path.join(__dirname, 'tmp', slicedKey);

          const { data } = await axios.get('http://localhost:3000/api/getObject', {
            params: { filename: Key },
            responseType: 'text',
          });
          const writeStream = createWriteStream(filePath);

          writeStream.write(data);
          writeStream.end();
          console.log(`File saved successfully: ${filePath}`);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
      }
    };

    fetchFiles();
  }
}

export default WebSocketHandler;
