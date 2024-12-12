import Docker from 'dockerode';
import WebSocket from 'ws';

export const docker = new Docker();
const initialPort = 8080;

export const containerExists = async (name: string): Promise<boolean> => {
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

export const pullAndCreateContainer = async (projectSlug: string): Promise<void> => {
    try {
        console.log(`Pulling container for project: ${projectSlug}`);
        const stream = await docker.pull('ubuntu:latest');
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

export const createContainer = async (projectSlug: string): Promise<void> => {
    try {
        const encodedProjectSlug = encodeURIComponent(projectSlug);
        const availablePort = await getNextAvailablePort(initialPort);
        const portBindings = {
            '80/tcp': [{ HostPort: `${availablePort}` }]
        };

        const container = await docker.createContainer({
            Image: 'ubuntu:latest',
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

export const retryContainerCheck = async (
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

export const attachContainerToWebSocket = async (ws: WebSocket, projectSlug: string): Promise<void> => {
    try {
        const encodedProjectSlug = encodeURIComponent(projectSlug);

        const containerExistsAfterRetries = await retryContainerCheck(encodedProjectSlug);

        if (!containerExistsAfterRetries) {
            console.error(`Container ${encodedProjectSlug} does not exist after retries.`);
            ws.send(JSON.stringify({ error: `Container ${projectSlug} does not exist.` }));
            await createContainer(encodedProjectSlug);
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
        });
    } catch (error) {
        console.error(`Error attaching to container [${projectSlug}]:`, error);
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
        ws.send(JSON.stringify({ error: errorMessage }));
    }
};

export const killContainer = async (projectSlug: string): Promise<void> => {
    const encodedProjectSlug = encodeURIComponent(projectSlug);
    const container = docker.getContainer(encodedProjectSlug);
    await container.kill();
    console.log(`Container [${projectSlug}] killed.`);
};

