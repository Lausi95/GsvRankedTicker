import {createClient, RedisClientType} from 'redis';
import {logging} from "./Logging";

export namespace cache {

  const log = logging.createLogger('cache redis');

  let redisClient: RedisClientType;

  export async function initialize(): Promise<void> {
    try {
      log.info('Initializing cache...');

      redisClient = createClient({url: process.env.REDIS_HOST || 'redis://localhost:6379'});
      redisClient.on('error', (err: any) => log.error(JSON.stringify(err)));

      await redisClient.connect().then(() => log.info('redis connected'));
    } catch {
      log.error('cannot connect to redis');
    }
  }

  export async function getFromCacheOrResolve<T>(group: string, key: string, resolveValue: () => Promise<T>): Promise<T> {
    if (!redisClient)
      return resolveValue();

    const cacheKey = `${group}|${key}`;

    if (await redisClient.exists(cacheKey)) {
      const redisValue = await redisClient.get(cacheKey);
      if (!redisValue) {
        return resolveValue();
      }
      return JSON.parse(redisValue);
    }

    const value = await resolveValue();
    await redisClient.set(cacheKey, JSON.stringify(value)).catch(() => log.warn('could not save value'));

    return value;
  }
}
