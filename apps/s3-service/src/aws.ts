import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import { Readable } from 'stream';
import { writeFile, unlink, createReadStream } from 'fs';
import { join } from 'path';
import mime from 'mime-types';

export const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

export async function uploadFile(filename: string, content: string) {
    if (typeof content !== 'string' || !content) {
        throw new Error('Content must be a non-empty string');
    }

    const tempFilePath = join(__dirname, '..', 'src', 'tmp', filename.split('/')[filename.split('/').length - 1]);

    await new Promise<void>((resolve, reject) => {
        writeFile(tempFilePath, content, 'utf8', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename,
        Body: createReadStream(tempFilePath),
        ContentType: mime.lookup(tempFilePath) || 'application/octet-stream',
    };

    try {
        const data = await s3Client.send(new PutObjectCommand(uploadParams));
        console.log("File uploaded successfully:", data);
        return data;
    } catch (err) {
        console.error("Error uploading file:", err);
        throw err;
    }
}

// Download file from S3
export async function downloadFile(s3Key: string): Promise<Readable | Buffer | void> {
    const downloadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${s3Key}`,
    };

    try {
        const { Body } = await s3Client.send(new GetObjectCommand(downloadParams));

        if (Body instanceof Readable || Buffer.isBuffer(Body)) {
            return Body;
        } else {
            console.error('Received body is not a readable stream or buffer.');
        }
    } catch (err) {
        console.error("Error downloading file:", err);
    }
}

// List all objects in the bucket
export async function listObjects(prefix: string = '') {
    const listParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Prefix: prefix,
    };

    try {
        const data = await s3Client.send(new ListObjectsV2Command(listParams));
        return data.Contents;
    } catch (err) {
        console.error("Error listing objects:", err);
    }
}

// Copy objects from one folder in the S3 bucket to another
export async function copyS3Folder(src: string, dest: string) {
    try {
        const listCommand = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME,
            Prefix: src,
        });

        const { Contents } = await s3Client.send(listCommand);

        if (!Contents || Contents.length === 0) {
            console.error("No contents found in the source folder.");
            return;
        }

        console.log("Copying files...");

        for (const obj of Contents) {
            const { Key } = obj;

            if (!Key) continue;

            const destKey = Key.replace(src, dest);

            const copyCommand = new CopyObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: destKey,
                CopySource: `${process.env.AWS_BUCKET_NAME}/${Key}`,
            });

            console.log(`Copying ${Key} to ${destKey}`);

            await s3Client.send(copyCommand);
            console.log(`Copied ${Key} to ${destKey}`);
        }

        console.log("Copying complete!");
    } catch (err) {
        console.error("Error copying folder from S3:", err);
    }
}

// Delete file from S3
export async function deleteFile(s3Key: string) {
    const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
    };

    try {
        const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log("File deleted successfully:", data);
        return data;
    } catch (err) {
        console.error("Error deleting file:", err);
    }
}
