const crypto = require('crypto');

class CommunicationClass {
  sourceID;

  outRequests = [];
  outResponses = [];
  inResponses = [];

  handlers = {};
  pollingAgent;

  autoPolling = false;
  autoPollingInterval = undefined;

  constructor(sourceID) {
    this.sourceID = sourceID;
  }

  getNow() {
    return Math.floor(Date.now() / 1000);
  }

  getExpirationTime(ageMinutes) {
    const now = this.getNow();
    return now + (ageMinutes * 60);
  }

  getRandomHash() {
    let current_date = (new Date()).valueOf().toString();
    let random = Math.random().toString();
    return crypto.createHash('md5').update(current_date + random).digest('hex');
  }

  sendRequest(methodName, destinationID, ageMinutes = 60, needResponse = true, ...parameters) {
    let requestTime = this.getNow();
    let expirationTime = this.getExpirationTime(ageMinutes);
    let requestID = this.getRandomHash();
    let request = {};
    request.methodName = methodName;
    request.parameters = parameters;
    request.sourceID = this.sourceID;
    request.destinationID = destinationID;
    request.requestID = requestID;
    request.requestTime = requestTime;
    request.expirationTime = expirationTime;
    request.needResponse = needResponse;
    this.outRequests.push(request);
    this.clearInResponses();
    return request;
  }

  getResponseByRequestID(requestID) {
    for (let i = 0; i < this.inResponses.length; i++) {
      if (this.inResponses[i].requestID === requestID) {
        let response = this.inResponses[i];
        this.inResponses.splice(i, 1);
        return response;
      }
    }
    return undefined;
  }

  async getResponse(methodName, destinationID, ageMinutes = 60, needResponse = true, interval_ms = 1000, ...parameters) {
    let delay = ms => new Promise(res => setTimeout(res, ms));
    let timedOut = false;
    delay(ageMinutes * 60 * 1000).then(() => {
      timedOut = true;
    });
    let request = this.sendRequest(methodName, destinationID, ageMinutes, needResponse, ...parameters);
    if (needResponse === false) return undefined;
    while (true) {
      await delay(interval_ms);
      let response = this.getResponseByRequestID(request.requestID);
      if (response) {
        try {
          let r = response.content;
          return r;
        } catch (error) {
          return undefined;
        }
      }
      if (timedOut) return undefined;
    }
  }

  async pollingHandler(outData) {
    if (typeof this.pollingAgent?.pollingHandler !== 'function') {
      throw new Error('Polling agent has no pollingHandler method');
    }
    const r = await this.pollingAgent.pollingHandler(outData, this.sourceID);
    return r;
  }

  async doPolling() {
    let outData;
    if (this.outRequests.length === 0 && this.outResponses.length === 0) {
      outData = '';
    } else {
      outData = {};
      outData.requests = this.outRequests;
      this.outRequests = [];
      outData.responses = this.outResponses;
      this.outResponses = [];
    }
    try {
      let inData = await this.pollingHandler(outData);
      if (inData !== '') {
        inData.responses.forEach((response) => {
          this.inResponses.push(response);
        });
        for (let request of inData.requests) {
          this.handleRequest(request);
        }
      }
    } catch (error) { }
  }

  clearInResponses() {
    let now = this.getNow();
    for (let i = this.inResponses.length - 1; i >= 0; i--) {
      let response = this.inResponses[i];
      if (now > response.expirationTime) {
        this.inResponses.splice(i, 1);
      }
    }
  }

  async handleRequest(request) {
    for (let key in this.handlers) {
      if (request.methodName === key) {
        let r;
        try {
          r = await this.handlers[key](...request.parameters);
          if (request.needResponse) {
            let response = {};
            response.content = r;
            response.requestID = request.requestID;
            response.destinationID = request.sourceID;
            response.expirationTime = request.expirationTime;
            this.outResponses.push(response);
          }
        } catch (error) { }
      }
    }
  }

  defineRequestHandler(methodName, handler) {
    this.handlers[methodName] = handler;
    console.log(`Defined request handler for '${methodName}'`);
  }

  definePollingAgent(pollingAgent) {
    this.pollingAgent = pollingAgent
  }

  startAutomaticPolling(interval_ms) {
    if (this.autoPolling) {
      clearInterval(this.autoPollingInterval);
    }
    this.autoPolling = true;
    this.autoPollingInterval = setInterval(() => {
      this.doPolling().catch(error => console.error(`Polling error: ${error}`));
    }, interval_ms);
  }

  stopAutomaticPolling() {
    if (this.autoPolling) {
      clearInterval(this.autoPollingInterval);
    }
    this.autoPolling = false;
  }

  defineAllBackendMethods(backendInstance) {
    try {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(backendInstance))
        .filter(name => typeof backendInstance[name] === 'function' && name !== 'constructor');
      methods.forEach(methodName => {
        try {
          const method = backendInstance[methodName].bind(backendInstance);
          this.defineRequestHandler(methodName, async (...parameters) => {
            try {
              const result = await method(...parameters);
              return result;
            } catch (error) {
              console.error(`Error in handler '${methodName}': ${error}`);
              throw error;
            }
          });
          console.log(`Registered handler '${methodName}''`);
        } catch (error) {
          console.error(`Failed to register '${methodName}'': ${error}`);
        }
      });
    } catch (error) {
      console.error(`Error loading backend file: ${error}`);
    }
  }

  static startServer(sourceID, backendInstance, pollingAgent, pollingIntervalMs = 1000) {
    let instance = new CommunicationClass(sourceID)
    instance.definePollingAgent(pollingAgent)
    instance.defineAllBackendMethods(backendInstance);
    instance.startAutomaticPolling(pollingIntervalMs);
    console.log(`The server running with sourceID '${sourceID}' polling every ${pollingIntervalMs}ms`);
    return instance;
  }
}

module.exports = CommunicationClass;