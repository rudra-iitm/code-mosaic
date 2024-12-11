import Docker from 'dockerode';
import WebSocket, { WebSocketServer } from 'ws';

const docker = new Docker();
const socket = new WebSocketServer({ port: 8000 });

socket.on('listening', () => {
    console.log('WebSocket server started and listening on port 8000');
});

const initialPort = 8080;

const portBindings: Docker.PortMap = {
    '80/tcp': [{ HostPort: `${initialPort}` }]
};

const isPortInUse = async (port: string): Promise<boolean> => {
    try {
        const containers = await docker.listContainers({ all: true });
        for (const containerInfo of containers) {
            const portBindings = containerInfo.Ports?.find(p => p.PublicPort.toString() === port);
            if (portBindings) {
                return true;
            }
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
        console.log(`Pulling the container for project: ${projectSlug}`);
        const stream = await docker.pull('ubuntu:latest');

        docker.modem.followProgress(
            stream,
            (err: any) => {
                if (err) {
                    console.error('Error during the pull process:', err);
                } else {
                    console.log('Pull finished successfully');
                    createContainer(projectSlug);
                }
            },
            (event: { status?: string }) => {
                if (event.status) {
                    process.stdout.write(`${event.status}\n`);
                }
            }
        );
    } catch (error) {
        console.error('Error pulling the container:', error);
    }
};

const createContainer = async (projectSlug: string): Promise<void> => {
    try {
        const encodedProjectSlug = encodeURIComponent(projectSlug); // Encode projectSlug
        const availablePort = await getNextAvailablePort(initialPort);
        const portBindings: Docker.PortMap = {
            '80/tcp': [{ HostPort: `${availablePort}` }]
        };

        const container = await docker.createContainer({
            Image: 'ubuntu:latest',
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            ExposedPorts: { '80/tcp': {} },
            HostConfig: {
                PortBindings: portBindings
            },
            name: encodedProjectSlug // Use the encoded projectSlug
        });

        await container.start();
        console.log(`Container started successfully for project: ${projectSlug} on port ${availablePort}`);
    } catch (error) {
        console.error('Error creating or starting the container:', error);
    }
};

const executeCommandInContainer = async (containerName: string, command: string[]): Promise<void> => {
    try {

        console.log(`Executing command [${command.join(' ')}] in container [${containerName}]...`);
        const container = docker.getContainer(containerName);

        console.log(`Container [${containerName}] found. Executing command...`);

        const exec = await container.exec({
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true
        });

        const stream = await exec.start({ hijack: true, stdin: true });
        stream.on('data', (chunk) => {
            console.log(`Output: `, chunk.toString());
        });

        stream.on('end', () => {
            console.log(`Command execution completed in container [${containerName}].`);
        });
    } catch (error) {
        console.error(`Error executing command in container [${containerName}]:`, error);
    }
};

// WebSocket handling
socket.on('connection', (ws: WebSocket) => {
    console.log('New client connected!');
    ws.send('Connection established');

    ws.on('message', async (data: WebSocket.Data) => {
        try {
            const message = JSON.parse(data.toString());
            const { projectSlug, command } = message;

            console.log('Received message:', message);

            if (projectSlug && command && command[0] === 'init') {
                console.log(`Container [${projectSlug}] not found. Pulling and creating the container...`);
                await pullAndCreateContainer(projectSlug);
            }
            else if (projectSlug && command) {
                const encodedProjectSlug = encodeURIComponent(projectSlug); // Encode projectSlug here as well
                const container = docker.getContainer(encodedProjectSlug);
                const containerInfo = await container.inspect();

                if (!containerInfo.State.Running) {
                    console.log(`Container [${encodedProjectSlug}] is not running. Starting container...`);
                    await container.start();
                }

                await executeCommandInContainer(encodedProjectSlug, command);
            }
            else if (projectSlug && command && command[0] === 'kill') {
                console.log(`Killing container [${projectSlug}]...`);
                const container = docker.getContainer(projectSlug);
                await container.kill();
                ws.send(`Container [${projectSlug}] killed successfully`);
            }
            else {
                ws.send('Invalid message format. Expected { projectSlug, command }');
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            ws.send('Error processing request');
        }
    });

    ws.on('close', () => console.log('Client has disconnected!'));

    ws.onerror = (event: WebSocket.ErrorEvent) => {
        console.error('WebSocket error:', event);
    };
});
