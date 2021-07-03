const crypto = require('crypto');

const hash = (sql) => crypto
  .createHash('md5')
  .update(sql)
  .digest('base64');

const defaultCacheOptions = {
  expire: 2629746,
  keyPrefix: 'sql.',
  hashType: 'md5',
  caching: 0,
};

const parseRedisResult = (redisResult) => {
  try {
    const result = JSON.parse(redisResult);
    return result;
  } catch (error) {
    return error;
  }
};

class MysqlRedis {
  constructor(mysqlConn, redisClient, cacheOptions) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;

    if (!cacheOptions) {
      this.cacheOptions = {
        expire: defaultCacheOptions.expire,
        keyPrefix: defaultCacheOptions.keyPrefix,
        hashType: defaultCacheOptions.hashType,
        caching: defaultCacheOptions.caching
      };
    } else {
      this.cacheOptions = {
        expire: cacheOptions.expire,
        keyPrefix: cacheOptions.keyPrefix,
        hashType: cacheOptions.hashType,
        caching: cacheOptions.caching,
      };
    }
  }

  query(sql, values, options, callback) {
    const cb = callback || (options || values);
    const selectSQL = sql + JSON.stringify(values);
    const hashType = this.cacheOptions;
    const key = hash(selectSQL, hashType);

    this.redisClient.get(key, (redisErr, redisResult) => {
      if (redisErr || redisResult == null) {
        const checkValues = (values) => {
          if (Array.isArray(values)) {
            return values;
          } else {
            values = Array.from(values);
            return values;
          }
        };
        this.mysqlConn.query(
          sql, checkValues(values),
          (mysqlErr, mysqlResult, fields) => {
            if (!redisErr) {
              const checkMysqlResult = () => {
                if (mysqlResult.length > 0 && Array.isArray(mysqlResult[0])) {
                  return Array.from(mysqlResult[0]);
                } else {
                  return mysqlResult;
                }
              };
              const mysqlJSON = JSON.stringify(checkMysqlResult());

              this.redisClient.set(key, mysqlJSON);
            }
            return cb(mysqlErr, mysqlResult, fields);
          },
        );
      } else {
        return cb(null, parseRedisResult(redisResult));
      }
    });
  }
}

module.exports = {
  MysqlRedis,
};
