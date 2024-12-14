import WebSocket, { WebSocketServer } from 'ws';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import path from 'path';
import { containerExists, pullAndCreateContainer, retryContainerCheck, attachContainerToWebSocket, killContainer, docker } from './dockerUtils';

const socket = new WebSocketServer({ port: 8000 });

socket.on('listening', () => {
    console.log('WebSocket server started and listening on port 8000');
});

let currentContainer: string | null = null;

const fetchInitFolder = async (projectSlug: string): Promise<void> => {
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
};

socket.on('connection', (ws: WebSocket) => {
    console.log('New client connected!');

    ws.on('message', async (data: WebSocket.Data) => {
        try {
            const jsonData = JSON.parse(data.toString());
            const { projectSlug, command } = jsonData;

            if (projectSlug && command) {
                const encodedProjectSlug = encodeURIComponent(projectSlug);

                if (command === 'init') {
                    console.log(`Initializing container for: ${projectSlug}`);
                    const doesContainerExist = await containerExists(encodedProjectSlug);
                    if (!doesContainerExist) {
                        await pullAndCreateContainer(projectSlug);
                    }
                    const containerExistsAfterRetries = await retryContainerCheck(encodedProjectSlug);
                    if (!containerExistsAfterRetries) {
                        console.error(`Container ${encodedProjectSlug} does not exist after retries.`);
                        ws.send(JSON.stringify({ error: `Container ${projectSlug} does not exist.` }));
                        return;
                    }
                    currentContainer = encodedProjectSlug;
                    await attachContainerToWebSocket(ws, projectSlug);
                    await fetchInitFolder(projectSlug);
                } else if (command === 'kill') {
                    console.log(`Killing container: ${projectSlug}`);
                    await killContainer(projectSlug);
                    ws.send(JSON.stringify({ message: `Container [${projectSlug}] killed.` }));
                }
            } else {
                console.error('Invalid projectSlug or command.');
                ws.send(JSON.stringify({ error: 'Invalid projectSlug or command.' }));
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                const container = docker.getContainer(currentContainer || '');
                if (container) {
                    const stream = await container.attach({
                        stream: true,
                        stdin: true,
                        stdout: true,
                        stderr: true,
                    });
                    stream.write(data.toString());
                }
            } else {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({ error: 'Error processing message.' }));
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
        currentContainer = null;
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

