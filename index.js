const crypto = require('crypto');

const hash = (sql) => crypto
  .createHash('md5')
  .update(sql)
  .digest('base64');

const checkValues = (values) => {
  if (Array.isArray(values)) {
    return values;
  } else {
    values = Array.from(values);
    return values;
  }
};

const checkMysqlResult = (mysqlResult) => {
  if (mysqlResult.length > 0 && Array.isArray(mysqlResult[0])) {
    return Array.from(mysqlResult[0]);
  } return mysqlResult;
};

const defaultCacheOptions = {
  expire: 2629746,
  keyPrefix: 'sql.',
  hashType: 'md5',
  caching: 0,
};

const parseRedisResult = (redisResult) => {
  const result = JSON.parse(redisResult);

  return result;
};

class MysqlRedis {
  constructor(mysqlConn, redisClient, cacheOptions) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;

    this.cacheOpttions = { ...defaultCacheOptions, ...cacheOptions };
  }

  query(sql, values, callback) {
    const selectSQL = sql + JSON.stringify(values);
    const hashType = this.cacheOptions;
    const key = hash(selectSQL, hashType);

    this.redisClient.get(key, (redisErr, redisResult) => {
      if (redisErr || redisResult == null) {
        this.mysqlConn.query(sql, checkValues(values), (mysqlErr, mysqlResult, fields) => {
          const mysqlJSON = JSON.stringify(checkMysqlResult(mysqlResult));

          this.redisClient.set(key, mysqlJSON);
          return callback(mysqlErr, mysqlResult, fields);
        });
      } else {
        console.log(parseRedisResult(redisResult));
        return callback(null, parseRedisResult(redisResult));
      }
      return '';
    });
  }
}

module.exports = {
  MysqlRedis,
};
