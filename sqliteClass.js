const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const { Database } = require('sqlite3');

class SqliteClass {

  db = null;
  verbose = true;

  constructor(verbose = true) {
    this.verbose = verbose;
  }

  async printVerbose(message) {
    if (this.verbose) {
      console.log(message);
    }
  }

  async connectDb(dbPath, readOnly = false) {
    try {
      const dbDir = path.dirname(dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      const mode = readOnly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;
      this.db = new Database(dbPath, mode, (err) => {
        if (err) {
          this.printVerbose(`Error connecting to SQLite database: ${err.message}`);
        }
      });
      return true;
    } catch (err) {
      await this.printVerbose(`Error connecting to SQLite database: ${err.message}`);
      return false;
    }
  }

  async closeDb() {
    try {
      if (this.db) {
        await new Promise((resolve, reject) => {
          this.db.close((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        await this.printVerbose('Database connection closed successfully.');
      } else {
        await this.printVerbose('No active database connection to close.');
      }
    } catch (err) {
      await this.printVerbose(`Error closing SQLite database connection: ${err.message}`);
    }
  }

  async runSql(sql, ...params) {
    try {
      return await new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    } catch (err) {
      await this.printVerbose(`Error executing SQL query: ${err.message}`);
      return null;
    }
  }

  async beginTransaction() {
    await this.runSql('BEGIN TRANSACTION');
  }

  async commit() {
    await this.runSql('COMMIT');
  }

  async rollback() {
    await this.runSql('ROLLBACK');
  }

  async insertRow(tableName, ...params) {
    try {
      const placeholders = params.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tableName} VALUES (${placeholders})`;
      await this.runSql(sql, ...params);
      return true;
    } catch (err) {
      await this.printVerbose(`Error inserting row into table: ${err.message}`);
      return false;
    }
  }

  async selectToArray(sql, ...params) {
    try {
      const rows = await this.runSql(sql, ...params);
      return rows;
    } catch (err) {
      await this.printVerbose(`Error converting SELECT result to array: ${err.message}`);
      return null;
    }
  }

  async *selectGenerator(sql, ...params) {
    const db = this.db;
    let resolveNext;
    let rejectNext;
    let done = false;
    const rowQueue = [];
    const getNextRow = () =>
      new Promise((resolve, reject) => {
        resolveNext = resolve;
        rejectNext = reject;
      });
    db.serialize(() => {
      db.each(
        sql,
        params,
        (err, row) => {
          if (err) {
            if (rejectNext) rejectNext(err);
            return;
          }
          if (resolveNext) {
            resolveNext({ value: row, done: false });
            resolveNext = null;
          } else {
            rowQueue.push(row);
          }
        },
        (err, count) => {
          done = true;
          if (resolveNext) {
            resolveNext({ value: undefined, done: true });
          }
          if (err) {
            console.error('Error iterating rows:', err.message);
          }
        }
      );
    });
    while (!done || rowQueue.length > 0) {
      if (rowQueue.length > 0) {
        yield rowQueue.shift();
      } else {
        try {
          const next = await getNextRow();
          if (next.done) break;
          yield next.value;
        } catch (err) {
          console.error('Error fetching row:', err.message);
          break;
        }
      }
    }
  }

  async runSqlScalar(sql, ...params) {
    try {
      const rows = await this.runSql(sql, ...params);
      return rows && rows.length > 0 ? rows[0][Object.keys(rows[0])[0]] : null;
    } catch (err) {
      return null;
    }
  }

  async createIndex(tableName, columnName) {
    const indexName = `${tableName}_${columnName}`;
    try {
      const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnName})`;
      await this.runSql(sql);
      await this.printVerbose(
        `Index '${indexName}' created successfully on column '${columnName}' of table '${tableName}'`
      );
      return true;
    } catch (err) {
      await this.printVerbose(`Error creating index: ${err.message}`);
      return false;
    }
  }

  static async getInstance(dbPath, pathIsRelative, readOnly = false, verbose = true) {
    let finalPath = dbPath;
    if (pathIsRelative) {
      const scriptDir = path.dirname(__filename);
      finalPath = path.join(scriptDir, dbPath);
    }
    const db = new SqliteClass(verbose);
    await db.connectDb(finalPath, readOnly);
    return db;
  }
}

module.exports = SqliteClass;