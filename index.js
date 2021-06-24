const crypto = require('crypto');

const HashTypes = {
  md5: 5,
};

const Caching = {
  CACHE: 0,
  SKIP: 1,
  REFRESH: 2,
};

Object.freeze(HashTypes);

const defaultCacheOptions = {
  expire: 2629746,
  keyPrefix: 'sql.',
  hashType: HashTypes.md5,
  caching: Caching.CACHE,
};

const md5Hash = (sql) => crypto
  .createHash('md5')
  .update(sql)
  .digest('base64');

const hash = (sql) => md5Hash(sql);

const parseRedisResult = (redisResult, key) => {
  try {
    const result = JSON.parse(redisResult);

    return result;
  } catch (e) {
    return [redisResult, [{ cacheHit: key }]];
  }
};

class MysqlRedis {
  constructor(mysqlConn, redisClient, cacheOptions) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;
    this.cacheOptions = {
      expire:
                (cacheOptions && cacheOptions.expire) || defaultCacheOptions.expire,
      keyPrefix:
                (cacheOptions && cacheOptions.keyPrefix)
                || defaultCacheOptions.keyPrefix,
      hashType:
                (cacheOptions && cacheOptions.hashType) || defaultCacheOptions.hashType,
      caching:
                (cacheOptions && cacheOptions.caching) || defaultCacheOptions.caching,
    };
  }

  query(sql, values, _options, _cb) {
    const cb = _cb || (_options || values); // in case expire is not provided, cb is third arg
    const options = _cb ? _options : !Array.isArray(values) ? values : {};

    const _s = sql + JSON.stringify(values);

    const prefix = (options && options.keyPrefix) || this.cacheOptions.keyPrefix;

    const hashType = (options && options.hashType) || this.cacheOptions.hashType;

    const key = prefix + ((options && options.hash) || hash(_s, hashType));

    const caching = (options && options.caching) || this.cacheOptions.caching;
    switch (caching) {
      case Caching.CACHE:
      default:
        this.redisClient.get(key, (redisErr, redisResult) => {
          if (redisErr || redisResult == null) {
            this.mysqlConn.query(
              sql,
              Array.isArray(values) ? values : [],
              (mysqlErr, mysqlResult, fields) => {
                if (mysqlErr) {
                  return cb(mysqlErr, null);
                }
                if (!redisErr) {
                  this.redisClient.set(
                    key,
                    JSON.stringify(
                      mysqlResult.length > 0 && Array.isArray(mysqlResult[0])
                        ? [mysqlResult[0]]
                        : mysqlResult,
                    ),
                    'EX',
                    (options && options.expire) || this.cacheOptions.expire,
                  );
                }
                return cb(mysqlErr, mysqlResult, fields);
              },
            );
          } else {
            return cb(null, parseRedisResult(redisResult, key));
          }
        });
    }
  }
}

// PROMISE API

class MysqlRedisAsync {
  constructor(mysqlConn, redisClient, cacheOptions) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;
    this.cacheOptions = {
      expire:
                (cacheOptions && cacheOptions.expire) || defaultCacheOptions.expire,
      keyPrefix:
                (cacheOptions && cacheOptions.keyPrefix)
                || defaultCacheOptions.keyPrefix,
      hashType:
                (cacheOptions && cacheOptions.hashType) || defaultCacheOptions.hashType,
      caching:
                (cacheOptions && cacheOptions.caching) || defaultCacheOptions.caching,
    };
  }

  query(sql, values, options) {
    // cb = cb || options || values; //in case expire is not provided, cb is third arg

    return new Promise(async (resolve, reject) => {
      options = options || (!Array.isArray(values) ? values : null);

      const _s = sql + JSON.stringify(values);
      const prefix = (options && options.keyPrefix) || this.cacheOptions.keyPrefix;

      const hashType = (options && options.hashType) || this.cacheOptions.hashType;

      const key = prefix + ((options && options.hash) || hash(_s, hashType));

      const caching = (options && options.caching) || this.cacheOptions.caching;

      switch (caching) {
        case Caching.SKIP:
          try {
            const [mysqlResult, fields] = await this.mysqlConn.query(
              sql,
              Array.isArray(values) ? values : [],
            );

            resolve([mysqlResult, fields]);
          } catch (mysqlErr) {
            reject(mysqlErr);
          }

          break;
        case Caching.REFRESH:
          try {
            const [mysqlResult, fields] = await this.mysqlConn.query(
              sql,
              Array.isArray(values) ? values : [],
            );
            await this.redisClient.set(
              key,
              JSON.stringify(mysqlResult),
              'EX',
              (options && options.expire) || this.cacheOptions.expire,
            );
            resolve([mysqlResult, fields]);
          } catch (mysqlErr) {
            reject(mysqlErr);
          }
          break;

        case Caching.CACHE:
        default:
          try {
            const redisResult = await this.redisClient.get(key);

            if (redisResult) {
              resolve(parseRedisResult(redisResult, key));
            } else {
              try {
                const [mysqlResult, fields] = await this.mysqlConn.query(
                  sql,
                  Array.isArray(values) ? values : [],
                );
                await this.redisClient.set(
                  key,
                  JSON.stringify(
                    mysqlResult.length > 0 && Array.isArray(mysqlResult[0])
                      ? [mysqlResult[0]]
                      : mysqlResult,
                  ),
                  'EX',
                  (options && options.expire) || this.cacheOptions.expire,
                );
                resolve([mysqlResult, fields]);
              } catch (mysqlErr) {
                reject(mysqlErr);
              }
            }
          } catch (redisErr) {
            try {
              const [mysqlResult, fields] = await this.mysqlConn.query(
                sql,
                Array.isArray(values) ? values : [],
              );
              resolve([mysqlResult, fields]);
            } catch (mysqlErr) {
              reject(mysqlErr);
            }
          }
          break;
      }
    });
  }
}

module.exports = {
  MysqlRedis, MysqlRedisAsync, HashTypes, Caching,
};
