import express from 'express';
import { Request, Response } from 'express';
import { copyS3Folder, downloadFile, listObjects, uploadFile } from './aws.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { z } from 'zod';
import { Readable } from 'stream';
import { createWriteStream } from 'fs';
import { FilterRuleName } from '@aws-sdk/client-s3';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/projectInit', async (req: Request, res: Response) => {
    const {tech, projectSlug} = req.body;
    console.log(tech, projectSlug);
    const schema = z.object({
        tech: z.string(),
        projectSlug: z.string(),
    });
    try {
        schema.parse(req.body);
        await copyS3Folder(`templates/${tech}`, `__workdir/${projectSlug}`);
        console.log(`Project copied successfully: ${tech} - ${projectSlug}`);
        res.status(200).send({message: 'Project copied successfully'});
    } catch (error) {
        res.status(400).send({message: 'Invalid request body'});
    }
});

app.get('/api/getObject', async (req: any, res: any) => {
    const schema = z.object({
        filename: z.string().optional(),
    });

    try {
        schema.parse(req.query);
        const { filename } = req.query;

        if (!filename) {
            return res.status(400).json({ message: 'Filename is required' });
        }

        const filenameStr = filename as string;
        console.log(`Downloading file: ${filenameStr}`);

        const data = await downloadFile(filenameStr);

        if (data instanceof Readable) {
            res.setHeader('Content-Disposition', `attachment; filename="${filenameStr}"`);
            return data.pipe(res);
        } else if (Buffer.isBuffer(data)) {
            const base64Data = data.toString('base64');
            return res.status(200).json({ filename: filenameStr, content: base64Data });
        } else {
            console.error('Unexpected data type received from downloadFile');
            return res.status(500).json({ message: 'Unexpected error while downloading file' });
        }

    } catch (error) {
        console.error('Error handling request:', error);
        return res.status(400).json({ message: 'Invalid request query' });
    }
});

app.post('/api/saveObject', async (req: any, res: any) => {
    const schema = z.object({
        filename: z.string().optional(),
        content: z.string().optional(),
    });

    try {
        schema.parse(req.body);

        const { filename, content } = req.body;

        if (!filename || !content) {
            return res.status(400).json({ message: 'Filename and content are required' });
        }

        const filenameStr = filename as string;
        const contentStr = content as string;

        if (typeof contentStr !== 'string') {
            return res.status(400).json({ message: 'Content must be a string' });
        }

        await uploadFile(filenameStr, contentStr);
        console.log(`File saved successfully: ${filenameStr}`);

        res.status(200).json({ message: 'File saved successfully' });
    } catch (error) {
        console.error('Error handling request:', error);
        return res.status(400).json({ message: 'Invalid request body' });
    }
});

app.get('/api/listObjects', async (req: Request, res: Response) => {
    const schema = z.object({
        projectSlug: z.string().optional(),
    });
    try {
        schema.parse(req.query);
        const { projectSlug } = req.query;
        const projectSlugStr = projectSlug as string;
        const data = await listObjects(`__workdir/${projectSlugStr}`);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(400).send({message: 'Invalid request query'});
    }
});

// const download = async () => {
//     // await copyS3Folder(`templates/${'vite-project'}`, `__workdir/${'trial-project'}`);
//     const data = await downloadFile('trial-project/package.json');

//     // save this into a file
//     if (data == void 0) {
//         console.error('No data received from download');
//         return;
//     }
//     const writeStream = createWriteStream('downloaded-package.json');
//     if (Buffer.isBuffer(data)) {
//         writeStream.write(data);
//         writeStream.end();
//     } else {
//         await new Promise((resolve, reject) => {
//             data.pipe(writeStream)
//                 .on('error', reject)
//                 .on('close', resolve);
//         });
//     }
//     console.log(`File downloaded successfully to package.json`);
// }

// download();

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
