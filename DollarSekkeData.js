const TelegramData = require('./TelegramData')

class DollarSekkeData {

  data = null

  async fetchDollarAndSekke() {
    let td = new TelegramData()
    let r = await td.getDollarAndSekke()
    if (r) {
      this.data = r
    }
  }

  getDollarAndSekke() {
    return this.data
  }

  async startFetching(interval=5000) {
    let delay = ms => new Promise(res => setTimeout(res, ms));
    while (true) {
      this.fetchDollarAndSekke()
      await delay(interval)
    }
  }

}

module.exports = DollarSekkeData;
