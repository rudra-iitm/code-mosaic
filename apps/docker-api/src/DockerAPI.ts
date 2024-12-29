import Docker from 'dockerode';
import WebSocket from 'ws';
import path from 'path';

class DockerAPI {
  private static instance: DockerAPI;
  public docker: Docker;
  private initialPort: number = 8080;

  private constructor() {
    this.docker = new Docker();
  }

  public static getInstance(): DockerAPI {
    if (!DockerAPI.instance) {
      DockerAPI.instance = new DockerAPI();
    }
    return DockerAPI.instance;
  }

  private async containerExists(name: string): Promise<boolean> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.some((c) => c.Names.includes(`/${name}`));
    } catch (error) {
      console.error('Error checking container existence:', error);
      return false;
    }
  }

  private async isPortInUse(port: string): Promise<boolean> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      for (const containerInfo of containers) {
        const portBinding = containerInfo.Ports?.find((p) => p.PublicPort?.toString() === port);
        if (portBinding) return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking port usage:', error);
      return false;
    }
  }

  private async getNextAvailablePort(currentPort: number): Promise<number> {
    let port = currentPort;
    while (await this.isPortInUse(port.toString())) {
      console.log(`Port ${port} is in use. Trying next port...`);
      port++;
    }
    return port;
  }

  public async pullAndCreateContainer(projectSlug: string): Promise<void> {
    try {
      console.log(`Pulling container for project: ${projectSlug}`);
      const stream = await this.docker.pull('ubuntu:latest');
      this.docker.modem.followProgress(stream, async (err: any) => {
        if (err) {
          console.error('Error during pull:', err);
        } else {
          console.log('Pull complete. Creating container...');
          await this.createContainer(projectSlug);
        }
      });
    } catch (error) {
      console.error('Error pulling container:', error);
    }
  }

  private async createContainer(projectSlug: string): Promise<void> {
    try {
      const encodedProjectSlug = encodeURIComponent(projectSlug);
      const availablePort = await this.getNextAvailablePort(this.initialPort);
      const portBindings = {
        '80/tcp': [{ HostPort: `${availablePort}` }],
      };

      const container = await this.docker.createContainer({
        Image: 'ubuntu:latest',
        Tty: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        OpenStdin: true,
        StdinOnce: false,
        Cmd: ['/bin/bash'],
        ExposedPorts: { '80/tcp': {} },
        HostConfig: { 
          PortBindings: portBindings
        },
        name: encodedProjectSlug,
        WorkingDir: '/workDir',
      });

      await container.start();
      console.log(`Container started for project: ${projectSlug} on port ${availablePort}`);
    } catch (error) {
      console.error('Error creating container:', error);
    }
  }

  private async execInContainer(containerName: string, command: string[]): Promise<void> {
    const container = this.docker.getContainer(containerName);
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise((resolve, reject) => {
      container.modem.demuxStream(stream, process.stdout, process.stderr);
      console.log(`Executing command [${command.join(' ')}] in container [${containerName}]`);
      stream.on('end', resolve);
    });

  }

  public async retryContainerCheck(
    encodedProjectSlug: string,
    retries: number = 10,
    delayMs: number = 1000
  ): Promise<boolean> {
    for (let attempt = 0; attempt < retries; attempt++) {
      if (await this.containerExists(encodedProjectSlug)) {
        return true;
      }
      console.log(`Retry ${attempt + 1}/${retries}: Container ${encodedProjectSlug} not found. Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  }

  public async attachContainerToWebSocket(ws: WebSocket, projectSlug: string): Promise<void> {
    try {
      const encodedProjectSlug = encodeURIComponent(projectSlug);
      const container = this.docker.getContainer(encodedProjectSlug);
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

      this.fileWatcher(ws, encodedProjectSlug);
    } catch (error) {
      console.error(`Error attaching to container [${projectSlug}]:`, error);
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
      ws.send(JSON.stringify({ error: errorMessage }));
    }
  }

  private async fileWatcher(ws: WebSocket, containerName: string) {
    const container = this.docker.getContainer(containerName);

    await this.execInContainer(containerName, ['apt-get', 'update']);
    await this.execInContainer(containerName, ['apt-get', 'install', '-y', 'inotify-tools']);
    
    const exec = await container.exec({
      AttachStdout: true,
      AttachStderr: true,
      Cmd: [
      'inotifywait', '-m', '-r', 
      '-e', 'modify,create,delete', 
      '--exclude', '.*\.(swp|bak|tmp|swx|swm|~)|^\d+$',
      '/workDir'
    ],
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    container.modem.demuxStream(stream, process.stdout, process.stderr);

    stream.on('data', async (chunk: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        const eventData = chunk.toString().trim();
        const [event, filename] = eventData.split(' ');

        console.log(`Event received: ${eventData}`);

        const fileTree = await this.getFileTree(containerName, '/workDir');
        ws.send(JSON.stringify({
            cmd: 'file-tree',
            event: event,
            filename: filename,
            content: fileTree
          }));
        }
      });

    console.log(`File watcher started for container [${containerName}]`);
  }

  private async getFileTree(containerName: string, dir: string): Promise<any> {
    const exec = await this.docker.getContainer(containerName).exec({
      Cmd: ['find', `${dir}`, '-type', 'f', '-o', '-type', 'd'],
      AttachStdout: true,
      AttachStderr: true,
    });
  
    const stream = await exec.start({ hijack: true, stdin: false });
  
    return new Promise((resolve, reject) => {
      let output = '';
      stream.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
  
      stream.on('end', () => {
        const lines = output.trim().split('\n');
        const fileSet = new Set<string>();
        const fileTree: any[] = [];
  
        lines.forEach(line => {
          fileSet.add(line);
        });
  
        fileSet.forEach(path => {
          const isDirectory = path.endsWith('/');
          fileTree.push({
            filepath: path,
            type: isDirectory ? 'dir' : 'file'
          });
        });
  
        resolve(fileTree);
      });
  
      stream.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  public async killContainer(projectSlug: string): Promise<void> {
    const encodedProjectSlug = encodeURIComponent(projectSlug);
    const container = this.docker.getContainer(encodedProjectSlug);
    await container.kill();
    console.log(`Container [${projectSlug}] killed.`);
  }

  public async writeFile(containerName: string, filepath: string, content: Buffer): Promise<void> {
    try {
      const container = this.docker.getContainer(containerName);
  
      const fileContent = content.toString('utf-8');

      const exec = await container.exec({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: ['sh', '-c', `echo -n "${fileContent}" > /workDir/${filepath}`],
      });

      const stream = await exec.start({ hijack: true, stdin: false });

      stream.on('data', (chunk: Buffer) => {
        console.log(`Container output: ${chunk.toString()}`);
      });
  
      stream.on('end', () => {
        console.log(`File written successfully to ${filepath} in container ${containerName}`);
      });

      stream.on('error', (err: any) => {
        console.error('Error writing file to container:', err);
      });
    } catch (error) {
      console.error('Error syncing file:', error);
    }
  }

  public async readFile(ws: WebSocket, containerName: string, filepath: string): Promise<Buffer> {
    try {
      const container = this.docker.getContainer(containerName);

      const exec = await container.exec({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: ['cat', `/workDir/${filepath}`],
      });

      const stream = await exec.start({ hijack: true, stdin: false });
  
      return new Promise<Buffer>((resolve, reject) => {
        let output = Buffer.alloc(0);
  
        stream.on('data', (chunk: Buffer) => {
          output = Buffer.concat([output, chunk]);
        });
  
        stream.on('end', () => {
          console.log(`File read successfully from ${filepath} in container ${containerName}`);
          ws.send(output.toString('utf-8'));
        });
  
        stream.on('error', (err: any) => {
          console.error('Error reading file from container:', err);
          reject(err);
        });
      });
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

}

export default DockerAPI.getInstance();
