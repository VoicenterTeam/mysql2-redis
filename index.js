const crypto = require('crypto');

const checkValues = (values) => (Array.isArray(values) ? values : Array.from(values));

const defaultCacheOptions = {
  keyPrefix: 'sql.',
  algorithm: 'md5',
  encoding: 'base64',
};

class MysqlRedis {
  constructor(mysqlConn, redisClient, cacheOptions) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;
    this.cacheOptions = { ...defaultCacheOptions, ...cacheOptions };
  }

  hash(sql) {
    return crypto
      .createHash(this.cacheOptions.algorithm)
      .update(sql)
      .digest(this.cacheOptions.encoding);
  }

  checkMysqlResult(mysqlResult) {
    if (mysqlResult.length > 0 && Array.isArray(mysqlResult[0])) {
      return Array.from(mysqlResult[0]);
    } return mysqlResult;
  }

  parseRedisResult(redisResult) {
    const result = JSON.parse(redisResult);

    return result;
  }

  query(sql, values, callback) {
    const selectSQL = sql + JSON.stringify(values);
    const key = this.cacheOptions.keyPrefix + this.hash(selectSQL);

    this.redisClient.get(key, (redisErr, redisResult) => {
      if (redisErr || redisResult == null) {
        this.mysqlConn.query(sql, checkValues(values), (mysqlErr, mysqlResult) => {
          const mysqlJSON = JSON.stringify(this.checkMysqlResult(mysqlResult));

          this.redisClient.set(key, mysqlJSON);
          return callback(mysqlErr, mysqlResult);
        });
      } else {
        return callback(null, this.parseRedisResult(redisResult));
      }
      return '';
    });
  }
}

module.exports = {
  MysqlRedis,
};
