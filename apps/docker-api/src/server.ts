import Docker from 'dockerode';
import WebSocket, { WebSocketServer } from 'ws';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import path from 'path';

const docker = new Docker();
const socket = new WebSocketServer({ port: 8000 });

socket.on('listening', () => {
    console.log('WebSocket server started and listening on port 8000');
});

const initialPort = 8080;

let currentContainer: string | null = null;

const containerExists = async (name: string): Promise<boolean> => {
    try {
        const containers = await docker.listContainers({ all: true });
        return containers.some((c) => c.Names.includes(`/${name}`));
    } catch (error) {
        console.error('Error checking container existence:', error);
        return false;
    }
};

const isPortInUse = async (port: string): Promise<boolean> => {
    try {
        const containers = await docker.listContainers({ all: true });
        for (const containerInfo of containers) {
            const portBinding = containerInfo.Ports?.find((p) => p.PublicPort?.toString() === port);
            if (portBinding) return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking port usage:', error);
        return false;
    }
};

const getNextAvailablePort = async (currentPort: number): Promise<number> => {
    let port = currentPort;
    while (await isPortInUse(port.toString())) {
        console.log(`Port ${port} is in use. Trying next port...`);
        port++;
    }
    return port;
};

const pullAndCreateContainer = async (projectSlug: string): Promise<void> => {
    try {
        console.log(`Pulling container for project: ${projectSlug}`);
        const stream = await docker.pull('node:latest');
        docker.modem.followProgress(stream, async (err: any) => {
            if (err) {
                console.error('Error during pull:', err);
            } else {
                console.log('Pull complete. Creating container...');
                await createContainer(projectSlug);
            }
        });
    } catch (error) {
        console.error('Error pulling container:', error);
    }
};

const createContainer = async (projectSlug: string): Promise<void> => {
    try {
        const encodedProjectSlug = encodeURIComponent(projectSlug);
        const availablePort = await getNextAvailablePort(initialPort);
        const portBindings = {
            '80/tcp': [{ HostPort: `${availablePort}` }],
            '5173': [{ HostPort: '3001' }],
        };

        const container = await docker.createContainer({
            Image: 'node:latest',
            Tty: true,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            OpenStdin: true,
            StdinOnce: false,
            Cmd: ['bash'],
            ExposedPorts: { '80/tcp': {} },
            HostConfig: { 
                PortBindings: portBindings, 
                Binds: [
                    `${__dirname}/tmp:/workDir`
                ]
             },
            name: encodedProjectSlug,
            WorkingDir: '/workDir',
        });

        await container.start();
        console.log(`Container started for project: ${projectSlug} on port ${availablePort}`);
    } catch (error) {
        console.error('Error creating container:', error);
    }
};

const retryContainerCheck = async (
    encodedProjectSlug: string,
    retries: number = 10,
    delayMs: number = 1000
): Promise<boolean> => {
    for (let attempt = 0; attempt < retries; attempt++) {
        if (await containerExists(encodedProjectSlug)) {
            return true;
        }
        console.log(`Retry ${attempt + 1}/${retries}: Container ${encodedProjectSlug} not found. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs)); // Wait for the delay
    }
    return false;
};

const attachContainerToWebSocket = async (ws: WebSocket, projectSlug: string): Promise<void> => {
    try {
        const encodedProjectSlug = encodeURIComponent(projectSlug);
        currentContainer = encodedProjectSlug;

        const containerExistsAfterRetries = await retryContainerCheck(encodedProjectSlug);

        if (!containerExistsAfterRetries) {
            console.error(`Container ${encodedProjectSlug} does not exist after retries.`);
            ws.send(JSON.stringify({ error: `Container ${projectSlug} does not exist.` }));
            await pullAndCreateContainer(encodedProjectSlug);
        }


        const container = docker.getContainer(encodedProjectSlug);
        const containerInfo = await container.inspect();

        if (!containerInfo.State.Running) {
            console.log(`Starting container: ${projectSlug}`);
            await container.start();
        }

        console.log(`Attaching to container: ${projectSlug}`);
        const exec = await container.exec({
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            Cmd: ['/bin/bash'],
            WorkingDir: '/workDir',
        });

        const stream = await exec.start({
            Tty: true,
            stdin: true,
            hijack: true,
        });

        stream.on('data', (chunk: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(chunk);
            }
        });

        ws.on('message', (message: string) => {
            stream.write(message);
        });

        ws.on('close', () => {
            console.log(`Detached from container: ${projectSlug}`);
            stream.end();
            currentContainer = null;
        });
    } catch (error) {
        console.error(`Error attaching to container [${projectSlug}]:`, error);
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
        ws.send(JSON.stringify({ error: errorMessage }));
        currentContainer = null;
    }
};

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
                    await attachContainerToWebSocket(ws, projectSlug);
                    await fetchInitFolder(projectSlug);
                } else if (command === 'kill') {
                    console.log(`Killing container: ${projectSlug}`);
                    const container = docker.getContainer(encodedProjectSlug);
                    await container.kill();
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
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

