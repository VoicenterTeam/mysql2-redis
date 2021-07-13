import crypto = require('crypto');
import { Default, Params } from "./interfaces";

class MysqlRedis implements Params {
  mysqlConn: any;
  redisClient: any;
  cacheOptions: any;

  defaultCacheOptions: Default = {
      keyPrefix: 'sql.',
      algorithm: 'md5',
      encoding: 'base64',
      colorCode: '31',
      debug: false
  };

  constructor(mysqlConn: any, redisClient: any, cacheOptions: any) {
    this.mysqlConn = mysqlConn;
    this.redisClient = redisClient;
    this.cacheOptions = { ...this.defaultCacheOptions, ...cacheOptions };
  }

  hash(sql: string) {
    return crypto
      .createHash(this.cacheOptions.algorithm)
      .update(sql)
      .digest(this.cacheOptions.encoding);
  }

  checkValues(values: string[]) {
    return (Array.isArray(values) ? values : Array(values));
  }

  checkMysqlResult(mysqlResult: object[]) {
    if (mysqlResult.length > 0 && Array.isArray(mysqlResult[0])) {
      return Array(mysqlResult[0]);
    }
    return mysqlResult;
    }

  query(sql: string, values: string[], callback: any) {
    const query = sql + JSON.stringify(values);
    const key = this.cacheOptions.keyPrefix + this.hash(query);

    this.redisClient.get(key, (redisErr: any, redisResult: any) => {
      if (this.cacheOptions.debug) {
          this.log(`searching for key ${key}`);
     }

      if (redisErr || redisResult == null) {
        if (this.cacheOptions.debug) {
            this.log(`key: ${key} not found`);
        }

        return this.mysqlConn.query(sql, this.checkValues(values), (mysqlErr: any, mysqlResult: object[]) => {
          const mysqlJSON = JSON.stringify(this.checkMysqlResult(mysqlResult));

          if (this.cacheOptions.debug) {
              this.log(`creating new key ${key}`);
          }

          this.redisClient.set(key, mysqlJSON);

          return callback(mysqlErr, mysqlResult);
        });
      }

      if (this.cacheOptions.debug) {
          this.log(`key ${key} successfully found`);
      }

      return callback(null, JSON.parse(redisResult));
    });
  }

  log(message: string) {
      console.log(`[${new Date().toLocaleTimeString()}] \x1b[${this.cacheOptions.colorCode}mmysql2-redis\x1b[0m: ${message}`);
  }
}

export { MysqlRedis };
