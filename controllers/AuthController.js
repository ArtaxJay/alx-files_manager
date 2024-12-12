import redisClient from '../utils/redis';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import sha1 from 'sha1';

class AuthController {
  static async getConnect(request, response) {
    const dataAuthorization = request.header('Authorization');
    let emailOfUser = dataAuthorization.split(' ')[1];
    const buff = Buffer.from(emailOfUser, 'base64');
    emailOfUser = buff.toString('ascii');
    const userDetails = emailOfUser.split(':'); // contains email and password
    if (userDetails.length !== 2) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const sha1HashedPasswrd = sha1(userDetails[1]);
    const users = dbClient.db.collection('users');
    users.findOne(
      { email: userDetails[0], password: sha1HashedPasswrd },
      async (err, user) => {
        if (user) {
          const token = uuidv4();
          const key = `auth_${token}`;
          await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
          response.status(200).json({ token });
        } else {
          response.status(401).json({ error: 'Unauthorized' });
        }
      }
    );
  }

  static async getDisconnect(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const id = await redisClient.get(key);
    if (id) {
      await redisClient.del(key);
      response.status(204).json({});
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = AuthController;
