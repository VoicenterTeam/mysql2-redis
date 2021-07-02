const crypto = require('crypto');

/** The update method is used to push data to later be turned into
 *  a hash with the digest method. update can be invoked multiple
 *  times to ingest streaming data, such as buffers from a file read stream.
 *  The argument for digest represents the output format, and may either be "binary",
 *  "hex" or "base64". It defaults to binary.
 */

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

    if (!cacheOptions) {
      this.cacheOptions = {
        expire: defaultCacheOptions.expire,
        keyPrefix: defaultCacheOptions.keyPrefix,
        hashType: defaultCacheOptions.hashType,
        caching: defaultCacheOptions.caching
      }
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
            const checkMysqlResult = () => {
              if (mysqlResult.length > 0 && Array.isArray(mysqlResult[0])) {
                return Array.from(mysqlResult[0]);
              } else {
                return mysqlResult;
              }
            };
            const mysqlJSON = JSON.stringify(checkMysqlResult());
            if (!redisErr) {
              this.redisClient.set(key, mysqlJSON);
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

module.exports = {
  MysqlRedis,
};
