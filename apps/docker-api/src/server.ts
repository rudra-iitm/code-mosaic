import Docker from 'dockerode';
const docker = new Docker();

const portBindings = {
    '80/tcp': [{ HostPort: '8080' }]
};

const pullContainer = async () => {
    try {
        const stream = await docker.pull('wordpress');
        // Now follow the progress using the stream returned by pull
        docker.modem.followProgress(stream, onFinished, onProgress);
    } catch (error) {
        console.error('Error pulling the container:', error);
    }

    function onFinished(err: any, output: any) {
        if (err) {
            console.error('Error during pull process:', err);
        } else {
            console.log('Pull finished successfully');
            createContainer();  // Proceed to create the container once the image is pulled
        }
    }

    function onProgress(event: { status: string; progress: string | Uint8Array }) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        if (event.status === 'Downloading') {
            process.stdout.write(event.progress);
        } else {
            process.stdout.write(event.status + "\n");
        }
    }
};

const createContainer = async () => {
    try {
        const container = await docker.createContainer({
            Image: 'wordpress',
            AttachStdin: false,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            ExposedPorts: { '80/tcp': {} },
            HostConfig: {
                PortBindings: portBindings
            },
            name: 'wordpress-site'
        });

        await container.start();
        console.log('Container started successfully!');
    } catch (error) {
        console.error('Error creating or starting container:', error);
    }
};

pullContainer();
