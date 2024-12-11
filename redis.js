import { createClient } from 'redis';
import { promisify } from 'util';

// Class to interact with Redis server
class RedisClient {
  constructor() {
    // Initialize Redis client
    this.redisConnection = createClient();
    this.redisConnection.on('error', err => {
      console.error(`Unable to connect to Redis server: ${err.message}`);
    });
  }

  // Method to check if Redis connection is active
  isAlive() {
    return this.redisConnection.connected;
  }

  // Asynchronous method to fetch the value of a given key
  async fetchValue(key) {
    const getAsync = promisify(this.redisConnection.get).bind(
      this.redisConnection
    );
    try {
      return await getAsync(key);
    } catch (err) {
      console.error(`Error fetching key "${key}": ${err.message}`);
      return null;
    }
  }

  // Asynchronous method to store a key-value pair with expiration time
  async storeValue(key, value, ttlInSeconds) {
    const setAsync = promisify(this.redisConnection.set).bind(
      this.redisConnection
    );
    try {
      await setAsync(key, value);
      await this.redisConnection.expire(key, ttlInSeconds);
    } catch (err) {
      console.error(
        `Error storing key "${key}" with value "${value}": ${err.message}`
      );
    }
  }

  // Asynchronous method to delete a key from Redis
  async removeValue(key) {
    const delAsync = promisify(this.redisConnection.del).bind(
      this.redisConnection
    );
    try {
      await delAsync(key);
    } catch (err) {
      console.error(`Error deleting key "${key}": ${err.message}`);
    }
  }
}

// Exporting an instance of RedisClient
const redisUtility = new RedisClient();
export default redisUtility;
