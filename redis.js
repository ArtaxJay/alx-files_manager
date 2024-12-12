import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', error => {
      console.error('Redis Client Error:', error);
    });
  }

  async isAlive() {
    try {
      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Redis Connection Error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const result = await this.client.get(key);
      return result;
    } catch (error) {
      console.error('Redis Get Error:', error);
      return null;
    }
  }

  async set(key, value, expiration) {
    try {
      await this.client.set(key, value, { EX: expiration });
    } catch (error) {
      console.error('Redis Set Error:', error);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis Delete Error:', error);
    }
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
