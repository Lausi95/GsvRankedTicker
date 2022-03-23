import {createClient, RedisClientType} from 'redis';
import {createLogger} from "./Logging";

export namespace cache {

  const log = createLogger('cache redis');

  let redisClient: RedisClientType;

  async function connect(): Promise<unknown> {
    try {
      if (redisClient)
        return;

      redisClient = createClient();
      redisClient.on('error', (err: any) => log.error(JSON.stringify(err)));

      return redisClient.connect().then(() => log.info('redis connected'));
    } catch {
      log.error('cannot connect to redis');
    }
  }

  export async function getFromCacheOrResolve<T>(group: string, key: string, resolveValue: () => Promise<T>): Promise<T> {
    await connect();

    const cacheKey = `${group}|${key}`;

    if (await redisClient.exists(cacheKey)) {
      log.info(`Cache HIT [${cacheKey}]`);
      const redisValue = await redisClient.get(cacheKey);
      if (!redisValue) {
        return resolveValue();
      }
      return JSON.parse(redisValue);
    }

    log.info(`Cache MISS [${cacheKey}]`);
    const value = await resolveValue();
    await redisClient.set(cacheKey, JSON.stringify(value)).catch(() => log.warn('could not save value'));

    return value;
  }
}
