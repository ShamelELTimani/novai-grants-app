//db.ts creates and reuses the MySQL connection.
//API routes call getPool() whenever they need to query the database. 
import mysql, { Pool } from "mysql2/promise";

declare global {
  // Prevent new pools on hot reload in development.
  // eslint-disable-next-line no-var
  var __novaiMysqlPool: Pool | undefined;
}



export function getPool() {         // create a connection one time and reuse it
  if (!global.__novaiMysqlPool) {
    global.__novaiMysqlPool = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "password",
    database: "novai_grants",
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
      dateStrings: true
    });
  }
  return global.__novaiMysqlPool;         // returns the database pool
}
