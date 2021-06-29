const crypto = require('crypto');
const md5Hash = (sql) => crypto.createHash('md5').update(sql).digest('base64');
const hash = (sql) => md5Hash(sql);

const parseRedisResult = (redisResult, key) => {
    try {
        const result = JSON.parse(redisResult);

        return result;
    } catch (e) {
        return [redisResult, [{cacheHit: key}]];
    }
};

class MysqlRedis {
    constructor(mysqlConn, redisClient) {
        this.mysqlConn = mysqlConn;
        this.redisClient = redisClient;
        this.cacheOptions = {
            expire: 2629746,
            keyPrefix: 'sql.',
            hashType: 'md5',
            caching: 0,
        };
    }

    query(sql, values, _options, _cb) {
        const cb = _cb || (_options || values);
        const s = sql + JSON.stringify(values);
        const hashType = this.cacheOptions;
        const key = hash(s, hashType);

        this.redisClient.get(key, (redisErr, redisResult) => {
            if (redisErr || redisResult == null) {
                this.mysqlConn.query(sql,
                    Array.isArray(values) ? values : [],
                    (mysqlErr, mysqlResult, fields) => cb(mysqlErr, mysqlResult, fields));
            } else {
                return cb(null, parseRedisResult(redisResult, key));
            }
        });
    }
}

module.exports = {
    MysqlRedis,
};
