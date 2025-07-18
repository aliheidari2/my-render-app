const axios = require('axios');
const { JSDOM } = require('jsdom');
const $ = require('jquery')(new JSDOM().window);

class TelegramData {

  proxyHost
  proxyPort
  headers

  constructor(proxyHost = null, proxyPort = null) {
    if (proxyHost) {
      this.proxyHost = proxyHost
      this.proxyPort = proxyPort
    }
    this.headers = [
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
    ];
  }

  async getUrlContent(url, timeout = 15000) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      return null
    }
  }

  get$FromHTMLString(htmlString, selector) {
    var tempElement = $('<div>').html(htmlString);
    if (selector)
      var value = tempElement.find(selector)
    else
      var value = tempElement
    return value;
  }

  async getPageData(channelName, messageNo, ascending) {
    let url
    if (ascending)
      url = `https://t.me/s/${channelName}?after=${messageNo}`
    else
      url = `https://t.me/s/${channelName}?before=${messageNo}`
    let html = await this.getUrlContent(url, 15000)
    let r
    let elements = this.get$FromHTMLString(html, ".tgme_widget_message_bubble")
    let list = []
    for (let e of elements) {
      try {
        r = $(e).find('.tgme_widget_message_text').html()
        r = r.replace('\n', ' ')
        r = r.replace('<br>', '<br>\n')
        let text = this.get$FromHTMLString(r).text()
        r = $(e).find("span.tgme_widget_message_meta a").attr('href')
        let url_parts = r.split('/');
        let messageNo = url_parts[url_parts.length - 1];
        r = $(e).find("span.tgme_widget_message_meta time").attr('datetime')
        let dateObj = new Date(r);
        let year = dateObj.getFullYear();
        let month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
        let day = ('0' + dateObj.getDate()).slice(-2);
        let hours = ('0' + dateObj.getHours()).slice(-2);
        let minutes = ('0' + dateObj.getMinutes()).slice(-2);
        let seconds = ('0' + dateObj.getSeconds()).slice(-2);
        let time = `${year}${month}${day}-${hours}${minutes}${seconds}`;
        time = this.stringTimeToUnixTime(time)
        list.push({ messageNo, text, time })
      } catch (error) { }
    }
    return list
  }

  stringTimeToUnixTime(strTime) {  //strTime (like "20240413-175405")
    const year = parseInt(strTime.substring(0, 4));
    const month = parseInt(strTime.substring(4, 6)) - 1;
    const day = parseInt(strTime.substring(6, 8));
    const hour = parseInt(strTime.substring(9, 11));
    const minute = parseInt(strTime.substring(11, 13));
    const second = parseInt(strTime.substring(13, 15));
    const date = new Date(year, month, day, hour, minute, second);
    const unixTime = date.getTime() / 1000;
    return unixTime;
  }

  getTextData(messageText) {
    let dollar = undefined;
    let sekke = undefined;
    let refinedText = '';
    const lines = messageText.split('\n');
    // const pattern = /.*(سکه|دلار).*?=.*?((\d|,)+)/g;
    // const pattern = /.*(سکه|دلار).*?(?::|تهران).*?((\d|,)+)/g;
    const pattern = /.*(سکه|دلار).*?=.*?((\d|,)+)/g;

    for (const line of lines) {
      if (line.trim() !== '') {
        refinedText += `${line}\n`;
      }
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const asset = match[1];
        let price = match[2];
        price = parseInt(price.replaceAll(',', ''));
        if (asset === 'سکه') {
          sekke = price * 10;
        } else {
          dollar = price * 10;
        }
      }
    }
    if (dollar === 0) {
      dollar = undefined;
    }
    if (sekke === 0) {
      sekke = undefined;
    }

    return [refinedText, dollar, sekke];
  }

  async getAssetsPrice(onlyDollar = false, onlySekke = false) {
    let messageNo = 99999999999999
    let dollarPrice = undefined
    let sekkePrice = undefined
    let dollarTime = undefined
    let sekkeTime = undefined
    while (true) {
      try {
        // let messages = await this.getPageData('sekkedollarrate', messageNo, false)
        let messages = await this.getPageData('arzdolar', messageNo, false)
        for (let i = messages.length - 1; i >= 0; i--) {
          let m = messages[i]
          let r = this.getTextData(m['text'])
          if (dollarPrice === undefined) {
            dollarPrice = r[1]
            dollarTime = m.time
          }
          if (sekkePrice === undefined) {
            sekkePrice = r[2]
            sekkeTime = m.time
          }
          if (onlyDollar) {
            if (dollarPrice !== undefined) {
              return { dollarPrice, dollarTime }
            }
          } else if (onlySekke) {
            if (sekkePrice !== undefined) {
              return { sekkePrice, sekkeTime }
            }
          } else {
            if (dollarPrice !== undefined && sekkePrice !== undefined) {
              return { dollarPrice, dollarTime, sekkePrice, sekkeTime }
            }
          }
        }
        messageNo = messages[0]['messageNo']
      } catch (e) {
        return null
      }
    }
  }

  async getDollar() {
    return this.getAssetsPrice(true, false)
  }

  async getSekke() {
    return this.getAssetsPrice(false, true)
  }

  async getDollarAndSekke() {

    function getTehranTimeString(unixTimestamp) {
      const date = new Date(unixTimestamp * 1000);
      const options = {
        timeZone: 'Asia/Tehran',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const tehranDate = date.toLocaleString('en-US', options);
      const [datePart, timePart] = tehranDate.split(', ');
      const [month, day, year] = datePart.split('/');
      const [hour, minute, second] = timePart.split(':');
      return `${year}${month}${day}-${hour}${minute}${second}`;
    }

    try {
      let r = await this.getAssetsPrice(false, false)
      let { dollarTime, sekkeTime } = r
      dollarTime = getTehranTimeString(dollarTime)
      sekkeTime = getTehranTimeString(sekkeTime)
      r = {
        dollarPrice: r.dollarPrice,
        dollarTime: r.dollarTime,
        dTime: dollarTime,
        sekkePrice: r.sekkePrice,
        sekkeTime: r.sekkeTime,
        sTime: sekkeTime
      }
      return r
    } catch (error) {
      return null
    }

  }

}

module.exports = TelegramData;
