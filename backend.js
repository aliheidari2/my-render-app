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
      console.error('Error saving GTD content:', error);
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

}

module.exports = Backend;