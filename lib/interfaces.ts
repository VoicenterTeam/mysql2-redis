interface MysqlRedisInterface extends Methods {
  mysqlConn: any;
  redisClient: any;
  cacheOptions: any;
}

interface Methods {
  hash(sql: string): string;
  checkValues(values: string[]): string[];
  checkMysqlResult(mysqlResult: object[]): object[];
  query(sql: string, values: string[], redisOpt: any, callback: any): any;
  log(message: string): void;
}

interface Default {
  expire: number;
  keyPrefix: string;
  algorithm: string;
  encoding: string;
  colorCode: string;
  debug: boolean
}

export {
  MysqlRedisInterface,
  Methods,
  Default,
}
