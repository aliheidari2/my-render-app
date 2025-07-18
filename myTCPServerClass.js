class myTCPServerClass {
  requests = [];
  responses = [];

  async handlePolling(pollingData, sourceID) {
    if (pollingData!=='') {
      pollingData.responses.forEach((response) => {
        this.responses.push(response);
      });
      pollingData.requests.forEach((request) => {
        this.requests.push(request);
      });
    }
    let outRequests = [];
    let outResponses = [];
    for (let i = this.requests.length - 1; i >= 0; i--) {
      let request = this.requests[i];
      if (request.destinationID === sourceID) {
        outRequests.push(request);
        this.requests.splice(i, 1);
      }
    }
    for (let i = this.responses.length - 1; i >= 0; i--) {
      let response = this.responses[i];
      if (response.destinationID === sourceID) {
        outResponses.push(response);
        this.responses.splice(i, 1);
      }
    }
    let outData 
    if (outRequests.length===0 && outResponses.length===0) {
      outData = ''
    } else {
      outData = { requests: outRequests, responses: outResponses };
    }
    return outData;
  }

  getNow() {
    // get current time in UTC
    let date = new Date();
    let year = date.getUTCFullYear();
    let month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    let day = date.getUTCDate().toString().padStart(2, '0');
    let hours = date.getUTCHours().toString().padStart(2, '0');
    let minutes = date.getUTCMinutes().toString().padStart(2, '0');
    let seconds = date.getUTCSeconds().toString().padStart(2, '0');
    // apply UTC offset of +3 hours and 30 minutes
    let offsetHours = 3;
    let offsetMinutes = 30;
    let offsetMilliseconds = (offsetHours * 60 + offsetMinutes) * 60 * 1000;
    date.setTime(date.getTime() + offsetMilliseconds);
    // format date in required format
    year = date.getUTCFullYear();
    month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    day = date.getUTCDate().toString().padStart(2, '0');
    hours = date.getUTCHours().toString().padStart(2, '0');
    minutes = date.getUTCMinutes().toString().padStart(2, '0');
    seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const formattedDate = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    return formattedDate
  }

  clearArrays() {
    let now = this.getNow();
    for (let i = this.requests.length - 1; i >= 0; i--) {
      let req = this.requests[i];
      if (now > req.expirationTime) {
        this.requests.splice(i, 1);
      }
    }
    for (let i = this.responses.length - 1; i >= 0; i--) {
      let response = this.responses[i];
      if (now > response.expirationTime) {
        this.responses.splice(i, 1);
      }
    }
  }

  startAutoClear(interval_ms = 5 * 60 * 1000) {
    setInterval(() => {
      this.clearArrays();
    }, interval_ms);
  }
}

module.exports = myTCPServerClass;
