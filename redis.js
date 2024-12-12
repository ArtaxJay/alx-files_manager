import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', error => {
      console.log(`Redis client not connected to server: ${error}`);
    });
  }

  isAlive() {
    return this.client.connected ? true : false;
  }

  async get(key) {
    const getRedisKey = promisify(this.client.get).bind(this.client);
    const keyValue = await getRedisKey(key);
    return keyValue;
  }

  async set(key, value, time) {
    const setRedisKey = promisify(this.client.set).bind(this.client);
    await setRedisKey(key, value);
    await this.client.expire(key, time);
  }

  async del(key) {
    const removeKeyValue = promisify(this.client.del).bind(this.client);
    await removeKeyValue(key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
