import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(request, response) {
    response
      .status(200)
      .json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(request, response) {
    const collectionNum = await dbClient.nbUsers();
    const numOfFiles = await dbClient.nbFiles();
    response.status(200).json({ users: collectionNum, files: numOfFiles });
  }
}

module.exports = AppController;
