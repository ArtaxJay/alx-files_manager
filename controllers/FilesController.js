import { ObjectID } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import { promises as fs } from 'fs';
import Queue from 'bull';
import redisClient from '../utils/redis';
import mime from 'mime-types';

const fileProcessingQueue = new Queue(
  'fileProcessingQueue',
  'redis://127.0.0.1:6379'
);

class FilesController {
  static async getUser(request) {
    const authorizationHeader = request.header('X-Token');
    const cacheKey = `auth_${authorizationHeader}`;
    const userId = await redisClient.get(cacheKey);
    if (userId) {
      const userCollection = dbClient.db.collection('users');
      const userObjectId = new ObjectID(userId);
      const user = await userCollection.findOne({ _id: userObjectId });
      if (!user) {
        return null;
      }
      return user;
    }
    return null;
  }

  static async postUpload(request, response) {
    const currentUser = await FilesController.getUser(request);
    if (!currentUser) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { fileName, fileType, parentFileId, isPublic = false } = request.body;
    const fileData = request.body.data;

    if (!fileName) {
      return response.status(400).json({ error: 'Missing file name' });
    }
    if (!fileType) {
      return response.status(400).json({ error: 'Missing file type' });
    }
    if (fileType !== 'folder' && !fileData) {
      return response.status(400).json({ error: 'Missing file data' });
    }

    const fileCollection = dbClient.db.collection('files');

    if (parentFileId) {
      const parentObjectId = new ObjectID(parentFileId);
      const parentFile = await fileCollection.findOne({
        _id: parentObjectId,
        userId: currentUser._id,
      });
      if (!parentFile) {
        return response.status(400).json({ error: 'Parent file not found' });
      }
      if (parentFile.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (fileType === 'folder') {
      fileCollection
        .insertOne({
          userId: currentUser._id,
          fileName,
          fileType,
          parentFileId: parentFileId || 0,
          isPublic,
        })
        .then(result => {
          response.status(201).json({
            id: result.insertedId,
            userId: currentUser._id,
            fileName,
            fileType,
            isPublic,
            parentFileId: parentFileId || 0,
          });
        })
        .catch(error => {
          console.log(error);
        });
    } else {
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const generatedFileName = `${filePath}/${uuidv4()}`;
      const fileBuffer = Buffer.from(fileData, 'base64');

      try {
        try {
          await fs.mkdir(filePath);
        } catch (error) {
          // Ignore error if directory already exists
        }

        await fs.writeFile(generatedFileName, fileBuffer);
      } catch (error) {
        console.log(error);
        return response.status(500).json({ error: 'Error saving file' });
      }

      fileCollection
        .insertOne({
          userId: currentUser._id,
          fileName,
          fileType,
          isPublic,
          parentFileId: parentFileId || 0,
          filePath: generatedFileName,
        })
        .then(result => {
          response.status(201).json({
            id: result.insertedId,
            userId: currentUser._id,
            fileName,
            fileType,
            isPublic,
            parentFileId: parentFileId || 0,
          });

          if (fileType === 'image') {
            fileProcessingQueue.add({
              userId: currentUser._id,
              fileId: result.insertedId,
            });
          }
        })
        .catch(error => {
          console.log(error);
          return response
            .status(500)
            .json({ error: 'Error saving file to database' });
        });
    }
  }
}

module.exports = FilesController;
