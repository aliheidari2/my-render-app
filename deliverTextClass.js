class DeliverTextClass {

  password
  textList = []

  constructor(password) {
    this.password = password
  }

  putText(text, password) {
    this.clearTextList()
    if (password != this.password) {
      return null
    }
    let id = this.getRandomID()
    let now = this.getNow()
    this.textList.push([text, id, now])
    return id
  }

  getText(password, id) {
    this.clearTextList()
    if (password != this.password) {
      return null
    }
    const entry = this.textList.find(item => item[1] == id)
    if (entry) {
      return entry[0] // Return the text
    }
    return null // Return null if ID not found
  }

  getNow() {
    const unixTime = Math.floor(Date.now() / 1000);
    return unixTime
  }

  getRandomID() {
    const random6Digit = Math.floor(100000 + Math.random() * 900000);
    return random6Digit
  }

  clearTextList() {
    const currentTime = this.getNow()
    const oneHourInSeconds = 3600 // 1 hour = 3600 seconds
    this.textList = this.textList.filter(item => {
      const timestamp = item[2] // Third element is the timestamp
      return (currentTime - timestamp) <= oneHourInSeconds
    })
  }

}