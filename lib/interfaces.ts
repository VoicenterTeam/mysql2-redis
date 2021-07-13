interface MainParams extends MainMethods {
    mysqlConn: any;
    redisClient: any;
    cacheOptions: any;
}

interface MainMethods {
    hash(sql: string): string;
    checkValues(values: string[]): string[];
    checkMysqlResult(mysqlResult: object[]): object[];
    query(sql: string, values: string[], callback: any): any;
    log(message: string): void;
}

interface Default {
    keyPrefix: string;
    algorithm: string;
    encoding: string;
    colorCode: string;
    debug: boolean
}

export {
    MainParams,
    MainMethods,
    Default,
}
