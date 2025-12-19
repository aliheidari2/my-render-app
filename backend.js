const fs = require('fs');
const path = require('path');

const myTCPServerClass = require('./myTCPServerClass')
const DollarSekkeData = require('./DollarSekkeData')

class Backend {

  myTCPServer;

  constructor() {
    this.myTCPServer = new myTCPServerClass()
    this.myTCPServer.startAutoClear()
    this.dollarSekkeData = new DollarSekkeData()
    this.dollarSekkeData.startFetching()
    this.monkeyID = 'monkey2'
  }

  async handlePolling(pollingData, sourceID) {
    let r = await this.myTCPServer.handlePolling(pollingData, sourceID)
    return r
  }

  async getPopulation() {
    console.log(`=========((getPopulation))==========`);
    return "30000000";
  }

  async getDollarAndSekke() {
    let r = this.dollarSekkeData.getDollarAndSekke()
    return r
  }

  // ============================================================================================================= 
  // ========================================= Monkey Methods ======================================================= 
  // ============================================================================================================= 

  async monkeyStartColab() {
    let client = global.client
    let r = await client.getResponse('startColab', this.monkeyID, 60, true, 1000)
    return r
  }

  async monkeyStopColab() {
    let client = global.client
    let r = await client.getResponse('stopColab', this.monkeyID, 60, true, 1000)
    return r
  }

  async monkeyRefreshPage() {
    let client = global.client
    let r = await client.getResponse('refreshPage', this.monkeyID, 60, true, 1000)
    return r
  }

  async monkeyGetStatus(forceRefresh = false) {
    let client = global.client
    let r = await client.getResponse('getStatus', this.monkeyID, 60, true, 1000, forceRefresh)
    return r
  }

  async monkeyGetTmuxOutput() {
    let client = global.client
    let r = await client.getResponse('getTmuxOutput', this.monkeyID, 60, true, 1000)
    return r
  }

  async monkeyRestartTmux() {
    let client = global.client
    let r = await client.getResponse('restartTmux', this.monkeyID, 60, true, 1000)
    return r
  }

  async monkeyStartKeepAlive() {
    let client = global.client
    let r = await client.getResponse('startKeepAlive', this.monkeyID, 60, true, 1000)
    return r
  }

  async monkeyStopKeepAlive() {
    let client = global.client
    let r = await client.getResponse('stopKeepAlive', this.monkeyID, 60, true, 1000)
    return r
  }

  // ============================================================================================================= 
  // ========================================= GTD Methods ======================================================= 
  // ============================================================================================================= 

  async getGTD(GTDContent) {
    try {
      const filePath = path.join(__dirname, '.data', 'GTD', 'gtd-content.txt');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, GTDContent, 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving GTD content: ', error);
      throw error;
    }
  }

  async sendGTD() {
    try {
      const filePath = path.join(__dirname, '.data', 'GTD', 'gtd-content.txt');
      // fs.mkdirSync(path.dirname(filePath), { recursive: true });
      let content = fs.readFileSync(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error('Error reading GTD content:', error);
      throw error;
    }
  }

  async testSqlite() {

    const SqliteClass = require('./sqliteClass');

    const dbPath = 'tmp.db'; // Path to the database file
    const isRelative = false; // Set to true if path is relative to script dir
    const readOnly = false;
    const verbose = true;

    let output = ''

    const db = await SqliteClass.getInstance(dbPath, isRelative, readOnly, verbose);

    if (!db) {
      console.error('Failed to connect to database');
      return;
    }

    try {
      // Begin transaction
      await db.beginTransaction();

      // Create a table (if not exists)
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE
        )
      `;
      await db.runSql(createTableSql);

      // Insert a row
      const insertSuccess = await db.insertRow('users', null, 'John Doe', 'john@example.com');
      if (insertSuccess) {
        output += '\nRow inserted successfully'
        console.log('Row inserted successfully');
      }

      // Create an index
      await db.createIndex('users', 'email');

      // Select rows to array
      const selectSql = 'SELECT * FROM users';
      const rows = await db.selectToArray(selectSql);
      output += `\nSelected rows:', ${rows}`
      console.log('Selected rows:', rows);

      // Use generator to iterate rows
      output += `\nIterating rows with generator:`
      console.log('Iterating rows with generator:');
      for await (const row of db.selectGenerator(selectSql)) {
        output += `\n${row}`
        console.log(row);
      }

      // Run scalar query
      const countSql = 'SELECT COUNT(*) FROM users';
      const count = await db.runSqlScalar(countSql);
      output += `\nUser count:, ${count}`
      console.log('User count:', count);

      // Commit transaction
      await db.commit();
    } catch (error) {
      console.error('Error in transaction:', error.message);
      await db.rollback();
    } finally {
      // Close the database
      await db.closeDb();
      return output
    }
  }

  async delFile() {
    const fs = require('fs');
    const path = require('path');
  
    const pwd = process.cwd();
    const relativePath = './tmp.db';
    const filePath = path.resolve(pwd, relativePath);
  
    try {
      fs.unlinkSync(filePath);
      return {
        currentWorkingDirectory: pwd,
        deletedFilePath: filePath,
        message: `File deleted successfully: ${filePath}`
      };
    } catch (err) {
      return {
        currentWorkingDirectory: pwd,
        attemptedFilePath: filePath,
        message: `Error deleting file: ${err.message}`
      };
    }
  }

}

module.exports = Backend;