const axios = require('axios');


class CommunicationAgentClass {

  serverUrl;
  agentType;

  initializeWebServerAgent(serverUrl) {
    this.serverUrl = serverUrl
    this.agentType = 'web-server'
  }

  async pollingHandler(data, sourceID) {
    if (this.agentType === 'web-server') {
      let r = await this.webServerHandler(data, sourceID)
      return r
    }
  }

  async webServerHandler(data, sourceID) {
    const outData = {
      methodName: 'handlePolling',
      parameters: [data, sourceID],
    };
    let response;
    try {
      response = await axios.post(this.serverUrl, outData, { responseType: 'text' });
      response = JSON.parse(response.data);
    } catch (error) {
      response = undefined;
    }
    // console.log(response, Date().toString());
    return response;
  }

}

module.exports = CommunicationAgentClass;
