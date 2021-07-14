
# mysql2-redis

- MysqlRedis checks if there is a cached result of the query in redis
- if not found in cache, it will retrieve data from mysql and on successful result cache it in redis for future queries
- if redis is unavailable or errors occurred, query will be served by mysql

## Hashing
The above is achieved by creating a unique hash for every query

In redis, the hash and query results are stored as key-value pair

## Getting Started

### Pre-Requisites
Internally MysqlRedis relies on mysql2's `query` function and redis's `get` and `set` functions

## How to install
`npm i @voicenter/mysql2-redis`

Importing using ES6 modules:

`import { MysqlRedis } from '@voicenter/mysql2-redis';
`
### Usage
```js
const { MysqlRedis } = require("@voicenter/mysql2-redis");
```

####  Creating an instance of MysqlRedis requires
- a mysql connection or pool (mysqlRedis will call it's query method when no cache found)
- redis connection (mysqlRedis will call its set and get methods)
- cache options (optional)

####  The default options of MysqlRedis
- cache options

```js
const defaultCacheOptions = {  
    keyPrefix: 'sql.', 
    algorithm: 'md5', 
    encoding: 'base64',
    colorCode: '31',
    debug: false,
};
```

Options can be specified when creating mysqlRedis instance or overridden at the time of query.
At query time, you can also provide a custom hash as *cacheOptions.hash*

#### Example
```js
    const mysql2 = require('mysql2');
    const redis = require("redis");
    const { MysqlRedis } = require('@voicenter/mysql2-redis');
    
    const mysqlConnection = mysql2.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'test'
    });
    
    const redisClient = redis.createClient();
    
    const options = {
      keyPrefix: 'sql-prefix.',
      algorithm: 'md5',
      encoding: 'base64',
      colorCode: '31',
      debug: true,
    };
    
    const mysqlRedis = new MysqlRedis( mysqlConnection, redisClient, options);
    
    const result = mysqlRedis.query(query, args, callback);

```
## License

This project is licensed under the [MIT](./LICENSE).
