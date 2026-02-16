const fs = require('fs');
const SqliteClass = require('./sqliteClass');

class Model {

  db;
  dbPath;

  constructor() {
    this.dbPath = './files/db/gtd.db'
  }

  async initialize() {
    const dbExists = fs.existsSync(this.dbPath);
    await this.openDB()
    if (!dbExists) {
      await this.createTables()
    }
  }

  async createTables() {
    let sql = `
      CREATE TABLE task (
      TaskID    INTEGER PRIMARY KEY,          
      Title     TEXT    NOT NULL,             
      Type      TEXT,                         
      DueDate   INTEGER,                      
      Stars     INTEGER NOT NULL DEFAULT 0,     
      NewType   TEXT,                         
      NewStars  INTEGER NOT NULL DEFAULT 0,
      Comment   TEXT
      );
    `
    await this.db.runSql(sql)
    await this.db.createIndex('task', 'Type')
    await this.db.createIndex('task', 'DueDate')
    await this.db.createIndex('task', 'Stars')
    await this.db.createIndex('task', 'NewType')
    await this.db.createIndex('task', 'NewStars')
    await this.db.createIndex('task', 'Comment')
    sql = `
      CREATE TABLE tagtask (
          TaskID INTEGER NOT NULL,
          TagID  INTEGER NOT NULL,
          PRIMARY KEY (TaskID, TagID)
      );
    `
    await this.db.runSql(sql)
    sql = `
      CREATE TABLE tag (
      TagID    INTEGER PRIMARY KEY,          
      Title     TEXT    NOT NULL          
      );
    `
    await this.db.runSql(sql)
  }

  async importData(data) {
    try {
      let { tasks, tag_task, tags } = data
      let sql = `delete from task`
      await this.db.runSql(sql)
      sql = `delete from tagtask`
      await this.db.runSql(sql)
      sql = `delete from tag`
      await this.db.runSql(sql)
      sql = `VACUUM`
      await this.db.runSql(sql)
      await this.db.beginTransaction()
      for (const task of tasks) {
        sql = "insert into task values(?,?,?,?,?,?,?,?)"
        await this.db.runSql(sql, task.TaskID, task.Title, task.Type, task.DueDate, task.Stars, task.Type, task.Stars, task.Comment)
      }
      for (const row of tag_task) {
        sql = "insert into tagtask values(?,?)"
        await this.db.runSql(sql, ...row)
      }
      for (const row of tags) {
        sql = "insert into tag values(?,?)"
        await this.db.runSql(sql, ...row)
      }
      await this.db.commit()
      return 'Data Imported...'
    } catch (error) {
      return `Error in Data...: ${error}`
    }
  }

  async getAllUpdatedData() {
    let sql = `
      SELECT 
          t.TaskID,
          t.NewType as Type
      FROM task t 
      WHERE t.NewType <> t.Type 
    `
    let newTypes = await this.db.runSql(sql);
    if (newTypes) {
      newTypes = newTypes.map((i) => {
        return [i.TaskID, i.Type]
      })
    } else {
      newTypes = []
    }
    sql = `
      SELECT 
          t.TaskID,
          t.NewStars as Stars
      FROM task t 
      WHERE t.NewStars <> t.Stars 
    `
    let newStars = await this.db.runSql(sql);
    if (newStars) {
      newStars = newStars.map((i) => {
        return [i.TaskID, i.Stars]
      })
    } else {
      newStars = []
    }
    return { newTypes, newStars }
  }

  async getNoDueTasks(tagID = null) {
    let sql
    if (tagID) {
      sql = `
        SELECT 
          t.TaskID,
          t.Title,
          t.NewType as Type
        FROM task t
        JOIN tagtask tt ON tt.TaskID = t.TaskID
        WHERE tt.TagID = ?
          AND t.NewType IN ('today', 'thisweek', 'next-actions');
      `
      return await this.db.runSql(sql, tagID);
    } else {
      sql = `
        SELECT
          t.TaskID,
          t.Title,
          t.NewType as Type
        FROM task t 
        WHERE t.NewType IN ('today', 'thisweek', 'next-actions');
      `
      return await this.db.runSql(sql);
    }
  }

  async getCurrentTasks(tagID = null, offset = 0) {
    let sql
    if (tagID) {
      sql = `
        SELECT 
            t.TaskID,
            t.Title,
            t.NewType as Type,
            t.DueDate,
            t.NewStars as Stars
        FROM task t
        JOIN tagtask tt ON tt.TaskID = t.TaskID
        WHERE tt.TagID = ?
          AND t.NewType IN ('today', 'thisweek', 'next-actions' ,'calendar' ,'deadline', 'due' ,'everyday');
      `
      return await this.db.runSql(sql, tagID);
    } else {
      sql = `SELECT 
                t.TaskID,
                t.Title,
                t.NewType as Type,
                t.DueDate,
                t.NewStars as Stars
             FROM task t 
             WHERE t.NewType IN ('today', 'thisweek', 'next-actions' ,'calendar' ,'deadline', 'due' ,'everyday');`
      return await this.db.runSql(sql);
    }
  }

  async getTags() {
    let sql = `select * from tag`
    let r = await this.db.runSql(sql)
    return r
  }

  async changeTaskType(taskIDs, newType) {
    await this.db.beginTransaction()
    for (const id of taskIDs) {
      const sql = `
        UPDATE task 
        SET NewType = ?
        WHERE TaskID = ?
      `;
      await this.db.runSql(sql, newType, id)
    }
    await this.db.commit()
  }

  async updateStars(newStars) {
    await this.db.beginTransaction()
    for (const id in newStars) {
      const sql = `
        UPDATE task 
        SET NewStars = ?
        WHERE TaskID = ?
      `;
      await this.db.runSql(sql, newStars[id], id)
    }
    await this.db.commit()
  }

  async openDB() {
    this.db = await SqliteClass.getInstance(this.dbPath, false, false, true)
  }

  async closeDB() {
    await this.db.closeDb()
  }

  async updateSampleTable(samples) {
    if (!samples || samples.length === 0)
      return
    let sql = `delete from samples`
    await this.db.runSql(sql)
    for (const element of samples) {
      sql = "insert into samples values(?,?,?,?,?,?)"
      await this.db.runSql(sql, ...element)
    }
  }

  async insertRecords(records) {
    records = records.map((r) => {
      return [r[0], r[1].trim(), r[2], r[3]]
    })
    await this.db.beginTransaction()
    for (const record of records) {
      let sql = "insert into records values(null,?,?,?,?,?,?,?)"
      await this.db.runSql(sql, ...[...record, null, null, null])
    }
    await this.db.commit()
  }

  async getInconsideredRecords(n) {
    let sql = `SELECT r.*, s.sample, s.service, s.subService FROM records r LEFT JOIN samples s ON r.dept = s.dept AND r.sampleNo = s.sampleNo WHERE r.registerTime IS NULL ORDER BY r.createTime ASC, r.id ASC LIMIT ${n}`
    let r = await this.db.runSql(sql)
    r = r.map((i) => {
      let text = i.sample ? i.sample.replace('ممممم', i.natCode) : null
      return {
        id: i.id,
        natCode: i.natCode,
        text: text,
        service: i.service,
        subService: i.subService
      }
    })
    return r
  }

  async setRecordResult(id, result) {
    if (!['contact', 'service', 'subservice', 'success'].includes(result)) {
      return
    }
    const now = Math.floor(Date.now() / 1000);
    const sql = `
        UPDATE records 
        SET registerResult = ?, 
            registerTime = ?
        WHERE id = ?
    `;
    await this.db.runSql(sql, result, now, id);
  }

  formatTimestamp(unixSeconds) {
    const d = new Date(unixSeconds * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  async getReport(days, detail) {
    let fromTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

    let sql = `
        SELECT 
        dept, 
        COUNT(*) AS record_count
        FROM records r
        WHERE r.createTime > ?
        GROUP BY dept
        ORDER BY record_count DESC
        `
    let r = await this.db.runSql(sql, fromTime);
    let deptStatus = '\n=============================\n==== Departments Status ====\n'
    if (r.length > 0) {
      let max = r[0].record_count
      for (const i of r) {
        deptStatus += `\n${i.dept}:\t${i.record_count} [${max - i.record_count}]`
      }
    }
    sql = `SELECT count(*) FROM records r WHERE r.registerTime IS NULL and r.createTime>?`;
    r = await this.db.runSqlScalar(sql, fromTime);
    deptStatus += `\nInconsidered Records Count: ${r}`

    sql = `
        SELECT 
             natCode
        FROM records r
        WHERE r.createTime > ?
        GROUP BY natCode
        HAVING COUNT(*) > 1
    `
    let duplicateDetail = '\n=============================\n==== Duplicate Detail ====\n'
    r = await this.db.runSql(sql, fromTime);
    for (let { natCode } of r) {
      duplicateDetail += `\n${natCode}`
      sql = `
        SELECT 
            r.dept,r.createTime
        FROM records r
        WHERE r.createTime > ?
        AND r.natCode = ?
        ORDER BY r.createTime                          
      `
      let r = await this.db.runSql(sql, fromTime, natCode);
      let minTime = r[0].createTime
      for (let { dept, createTime } of r) {
        let days = Math.round((createTime - minTime) / (24 * 60 * 60))
        duplicateDetail += `\n\t${dept} - ${this.formatTimestamp(createTime)} [${days} days]`;
      }
    }

    sql = `
        SELECT 
            id, dept, sampleNo, natCode, createTime, registerResult
        FROM records r
        WHERE r.createTime > ?
        AND registerResult IS NOT NULL 
        AND registerResult <> 'success'
        ORDER BY registerResult,createTime
    `
    r = await this.db.runSql(sql, fromTime);
    let invalidNatCodes = '\n=============================\n==== Invalid NatCodes ====\n'
    for (const i of r) {
      invalidNatCodes += `\n${i.natCode} [${i.id}] : ${i.registerResult} - ${i.dept} [${i.sampleNo}] - ${this.formatTimestamp(i.createTime)}`
    }

    r = duplicateDetail + invalidNatCodes + deptStatus

    return r
  }

}

module.exports = Model;
