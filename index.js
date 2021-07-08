const crypto = require('crypto');

const checkValues = (values) => (Array.isArray(values) ? values : Array.from(values));

const defaultCacheOptions = {
  keyPrefix: 'sql.',
  algorithm: 'md5',
  encoding: 'base64',
};

const checkMysqlResult = (mysqlResult) => {
  if (mysqlResult.length > 0 && Array.isArray(mysqlResult[0])) {
    return Array.from(mysqlResult[0]);
  } return mysqlResult;
};

const parseRedisResult = (redisResult) => {
  const result = JSON.parse(redisResult);

  return result;
};

class MysqlRedis {
  constructor(mysqlConn, redisClient, cacheOptions) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;
    this.cacheOptions = { ...defaultCacheOptions, ...cacheOptions };
  }

  query(sql, values, callback) {
    const selectSQL = sql + JSON.stringify(values);
    const hash = () => crypto
      .createHash(this.cacheOptions.algorithm)
      .update(sql)
      .digest(this.cacheOptions.encoding);

    const key = this.cacheOptions.keyPrefix + hash(selectSQL);

    this.redisClient.get(key, (redisErr, redisResult) => {
      if (redisErr || redisResult == null) {
        this.mysqlConn.query(sql, checkValues(values), (mysqlErr, mysqlResult) => {
          const mysqlJSON = JSON.stringify(checkMysqlResult(mysqlResult));

          this.redisClient.set(key, mysqlJSON);
          return callback(mysqlErr, mysqlResult);
        });
      } else {
        return callback(null, parseRedisResult(redisResult));
      }
      return '';
    });
  }
}

module.exports = {
  MysqlRedis,
};
