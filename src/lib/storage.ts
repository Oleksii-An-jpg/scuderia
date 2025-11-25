'use server'
import {getStorage} from "firebase-admin/storage";

export async function uploadDocToBucket(file: File) {
    const bucket = getStorage().bucket('scuderia-docs');
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileRef = bucket.file(file.name);

    await fileRef.save(buffer, {
        contentType: file.type,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Make public
    await fileRef.makePublic();

    return fileRef.name;
}