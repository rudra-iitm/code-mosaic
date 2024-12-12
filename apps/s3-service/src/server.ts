import express from 'express';
import { Request, Response } from 'express';
import { copyS3Folder, downloadFile, listObjects } from './aws.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { z } from 'zod';

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
        await copyS3Folder(`templates/${tech}`, `workdir/${projectSlug}`);
        console.log(`Project copied successfully: ${tech} - ${projectSlug}`);
        res.status(200).send({message: 'Project copied successfully'});
    } catch (error) {
        res.status(400).send({message: 'Invalid request body'});
    }
});

app.get('/api/downloadFile', async (req: Request, res: Response) => {
    const schema = z.object({
        s3Key: z.string(),
    });
    try {
        schema.parse(req.query);
        const { s3Key } = req.query;
        const s3KeyStr = s3Key as string;
        const data = await downloadFile(s3KeyStr);
        console.log(`Files downloaded successfully: ${s3KeyStr}`);
        res.status(200).send(data);
    } catch (error) {
        res.status(400).send({message: 'Invalid request query'});
    }
});

app.get('/api/listObjects', async (req: Request, res: Response) => {
    const schema = z.object({
        prefix: z.string().optional(),
    });
    try {
        schema.parse(req.query);
        const { prefix } = req.query;
        const prefixStr = prefix as string;
        const data = await listObjects(prefixStr);
        console.log(`Objects listed successfully: ${prefixStr}`);
        res.status(200).send(data);
    } catch (error) {
        res.status(400).send({message: 'Invalid request query'});
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
