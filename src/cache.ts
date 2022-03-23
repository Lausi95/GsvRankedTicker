import {createClient, RedisClientType} from 'redis';
import {createLogger} from "./Logging";

export namespace cache {
  const log = createLogger('cache redis');

  let redisClient: RedisClientType;

  async function connect(): Promise<void> {
    if (redisClient)
      return;

    redisClient = createClient();
    redisClient.on('error', (err) => log.error(JSON.stringify(err)));

    return redisClient.connect();
  }

  export async function getOrResolve<T>(group: string, key: string, supplier: () => Promise<T>): Promise<T> {
    await connect()

    const cacheKey = `${group}|${key}`;

    if (await redisClient.exists(cacheKey)) {
      const redisValue = await redisClient.get(cacheKey);
      if (!redisValue) {
        return supplier();
      }
      return JSON.parse(redisValue);
    }

    const value = await supplier();
    await redisClient.set(cacheKey, JSON.stringify(value)).catch(err => log.warn('could not save value'));

    return value;
  }
}
