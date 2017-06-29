// ==UserScript==
// @name        Grabber
// @namespace   https://github.com/lap00zza/
// @version     0.1.1
// @description Grab links from 9anime!
// @author      Jewel Mahanta
// @icon        https://image.ibb.co/fnOY7k/icon48.png
// @match       *://9anime.to/watch/*
// @match       *://9anime.is/watch/*
// @match       *://9anime.tv/watch/*
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// @license     MIT License
// ==/UserScript==
(function () {
  'use strict'
  console.log('Grabber ' + window.GM_info.script.version + ' is now running!')
  var dlInProgress = false // global switch to indicate dl status
  var dlEpisodeIds = [] // list of id's currently being downloaded
  var dlServerType = '' // FIXME: cant queue different server types together
  var dlAggregateLinks = '' // stores all the download links as a single string
  var ts = document.getElementsByTagName('body')[0].dataset['ts'] // ts is needed to send API requests

  // Apply styles
  var styles = [
    '.grabber--fail {',
    '   color: indianred;}',
    '.grabber__btn {',
    '    border: 1px solid #555;',
    '    border-radius: 2px;',
    '    background-color: #16151c;',
    '    margin-top: 5px;}',
    '.grabber__btn:hover {',
    '    background-color: #111111;}',
    '.grabber__btn:active {',
    '    background-color: #151515;}',
    '.grabber__notification {',
    '   padding: 0 10px;',
    '   margin-bottom: 10px;}',
    '.grabber__notification > span {',
    '   display: inline-block;',
    '   font-weight: 500;}',
    '.grabber__notification > #grabber__status {',
    '   margin-left: 5px;',
    '   display: inline-block;',
    '   color: #888;}'
  ]
  window.GM_addStyle(styles.join(''))

  // Append the status bar
  var servers = document.getElementById('servers')
  var statusContainer = document.createElement('div')
  var grabberStatus = document.createElement('div')
  var statusLabel = document.createElement('span')

  statusContainer.classList.add('grabber__notification')
  grabberStatus.id = 'grabber__status'
  grabberStatus.appendChild(document.createTextNode('ready! Press Grab All to start.'))
  statusLabel.appendChild(document.createTextNode('Grabber:'))
  statusContainer.appendChild(statusLabel)
  statusContainer.appendChild(grabberStatus)
  servers.insertBefore(statusContainer, servers.firstChild)

  /********************************************************************************************************************/
  // Token generation scheme for 9anime. The token
  // is used for _ value when sending any API requests.
  const DD = 'gIXCaNh' // This might change in the future

  function s (t) {
    var e
    var i = 0
    for (e = 0; e < t.length; e++) {
      i += t.charCodeAt(e) * e + e
    }
    return i
  }

  function a (t, e) {
    var i
    var n = 0
    for (i = 0; i < Math.max(t.length, e.length); i++) {
      n += i < e.length ? e.charCodeAt(i) : 0
      n += i < t.length ? t.charCodeAt(i) : 0
    }
    return Number(n).toString(16)
  }

  function generateToken (data, initialState) {
    var keys = Object.keys(data)
    var _ = s(DD) + (initialState || 0)
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      var trans = a(DD + key, data[key].toString())
      _ += s(trans)
    }
    return _
  }

  /********************************************************************************************************************/
  /**
   * This function does the following
   * 1. fetch the RapidVideo page
   * 2. regex match and get the video sources
   * 3. get the video links
   * @param {string} url - The RapidVideo url to download videos
   */
  function getVideoLinksRV (url) {
    var re = /("sources": \[)(.*)(}])/g

    return new Promise(function (resolve, reject) {
      // We are using GM_xmlhttpRequest since we need to make
      // cross origin requests.
      window.GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
          try {
            var blob = response.responseText.match(re)[0]
            var parsed = JSON.parse('{' + blob + '}')
            dlAggregateLinks += parsed['sources'][0]['file'] + '\n'
            resolve()
          } catch (e) {
            reject(e)
          }
        },
        onerror: function (response) {
          reject(response.responseText)
        }
      })
    })
  }

  /**
   * Get the grabber info from the 9anime API.
   * @param {string} qParams
   *    A list of query parameters to send to the API.
   */
  function getGrabber (qParams) {
    return new Promise(function (resolve, reject) {
      var xhr = new window.XMLHttpRequest()
      xhr.open('GET', '/ajax/episode/info?' + qParams, true)
      xhr.onload = function () {
        if (xhr.status === 200) {
          if (dlServerType === 'RapidVideo') {
            getVideoLinksRV(JSON.parse(this.responseText)[['target']])
              .then(function () {
                resolve()
              })
              .catch(function (e) {
                reject(e)
              })
          }
        } else {
          reject(xhr.statusText)
        }
      }
      xhr.onerror = function () {
        console.log('error')
        reject(xhr.statusText)
      }
      xhr.send()
    })
  }

  /**
   * This function requeue's the processGrabber to run after
   * 2 seconds to avoid overloading the 9anime API and/or
   * getting our IP flagged as bot.
   */
  function requeue () {
    if (dlEpisodeIds.length !== 0) {
      window.dlTimeout = setTimeout(processGrabber, 2000)
    } else {
      clearTimeout(window.dlTimeout)
      dlInProgress = false
      grabberStatus.innerHTML = 'All done. The completed links are copied to your clipboard.'
      window.GM_setClipboard(dlAggregateLinks)
    }
  }

  /***
   * Handles the grabbing process.
   */
  function processGrabber () {
    var epId = dlEpisodeIds.shift()
    grabberStatus.innerHTML = 'Fetching ' + epId

    var data = {
      ts: ts,
      id: epId,
      update: 0
    }
    data['_'] = generateToken(data)

    // Generate the query parameters
    var qParams = ''
    var dKeys = Object.keys(data)
    for (var i = 0; i < dKeys.length; i++) {
      if (i === 0) {
        qParams += dKeys[i] + '=' + data[dKeys[i]]
      } else {
        qParams += '&' + dKeys[i] + '=' + data[dKeys[i]]
      }
    }
    getGrabber(qParams)
      .then(function () {
        grabberStatus.innerHTML = 'Completed ' + epId
        requeue()
      })
      .catch(function () {
        grabberStatus.innerHTML = '<span class="grabber--fail">Failed ' + epId + '</span>'
        requeue()
      })
  }

  /***
   * Generates a nice looking 'Download All' button that are
   * added below the server labels.
   * @param {string} type
   *    The server type to generate this button for. Example:
   *    RapidVideo, Openload etc. Currently only support
   *    grabbing RapidVideo links.
   * @returns {Element}
   *    Download All button for specified server
   */
  function generateDlBtn (type) {
    var dlBtn = document.createElement('button')
    dlBtn.dataset['type'] = type
    dlBtn.classList.add('grabber__btn')
    dlBtn.appendChild(document.createTextNode('Grab All'))
    dlBtn.addEventListener('click', function () {
      var serverDiv = this.parentNode.parentNode
      var epLinks = serverDiv.getElementsByTagName('a')
      for (var i = 0; i < epLinks.length; i++) {
        dlEpisodeIds.push(epLinks[i].dataset['id'])
      }
      if (!dlInProgress) {
        grabberStatus.innerHTML = 'starting grabber...'
        dlServerType = this.dataset['type']
        dlInProgress = true
        dlAggregateLinks = ''
        processGrabber()
      }
    })
    return dlBtn
  }

  // Attach the download button to RapidVideo for now.
  var serverLabels = document.querySelectorAll('.server.row > label')
  for (var i = 0; i < serverLabels.length; i++) {
    var serverLabel = serverLabels[i].innerText.trim()
    if (/^RapidVideo$/i.test(serverLabel)) {
      console.log(serverLabels[i])
      serverLabels[i].appendChild(generateDlBtn('RapidVideo'))
    }
  }
})()
