const crypto = require('crypto');

const defaultCacheOptions = {
  keyPrefix: 'sql.',
  algorithm: 'md5',
  encoding: 'base64',
  colorCode: '31',
  debug: false,
};

class MysqlRedis {
  constructor(mysqlConn, redisClient, cacheOptions) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;
    this.cacheOptions = { ...defaultCacheOptions, ...cacheOptions };
  }

  log(message) {
    console.log(`[${new Date().toLocaleTimeString()}] \x1b[${this.cacheOptions.colorCode}mmysql2-redis\x1b[0m: ${message}`);
  }

  checkValues(values) {
    return (Array.isArray(values) ? values : Array.from(values));
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
    }

    return mysqlResult;
  }

  query(sql, values, callback) {
    const query = sql + JSON.stringify(values);
    const key = this.cacheOptions.keyPrefix + this.hash(query);

    this.redisClient.get(key, (redisErr, redisResult) => {
      if (this.cacheOptions.debug) this.log(`searching for key ${key}`);

      if (redisErr || redisResult == null) {
        if (this.cacheOptions.debug) this.log(`key: ${key} not found`);

        return this.mysqlConn.query(sql, this.checkValues(values), (mysqlErr, mysqlResult) => {
          const mysqlJSON = JSON.stringify(this.checkMysqlResult(mysqlResult));

          if (this.cacheOptions.debug) this.log(`creating new key ${key}`);

          this.redisClient.set(key, mysqlJSON);

          return callback(mysqlErr, mysqlResult);
        });
      }

      if (this.cacheOptions.debug) this.log(`key ${key} successfully found`);

      return callback(null, JSON.parse(redisResult));
    });
  }
}

module.exports = {
  MysqlRedis,
};
