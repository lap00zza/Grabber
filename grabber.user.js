// ==UserScript==
// @name        Grabber
// @namespace   https://github.com/lap00zza/
// @version     0.3.0
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

/* global GM_info, GM_addStyle, GM_xmlhttpRequest, GM_setClipboard */

(function () {
  'use strict'
  console.log('Grabber ' + GM_info.script.version + ' is now running!')
  var dlInProgress = false // global switch to indicate dl status
  var dlEpisodeIds = [] // list of id's currently being downloaded
  var dlServerType = '' // FIXME: cant queue different server types together
  var dlAggregateLinks = '' // stores all the download links as a single string
  var ts = document.getElementsByTagName('body')[0].dataset['ts'] // ts is needed to send API requests
  var animeName = document.querySelectorAll('h1.title')[0].innerText
  // metadata stores relevant information about the
  // downloaded videos. It is especially helpful in
  // the case of RapidVideo where the filenames cant
  // be modified using any url params and have to be
  // renamed manually or by using a separate program
  var metadata = {
    animeName: animeName,
    animeUrl: window.location.href,
    files: []
  }

  // Apply styles
  var styles = [
    '#grabber__metadata-link {',
    '   margin-left: 5px;}',
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
  GM_addStyle(styles.join(''))

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
  var metadataUrl = null
  function createMetadataFile () {
    var data = new window.Blob([JSON.stringify(metadata, null, '\t')], {type: 'text/json'})
    // If we are replacing a previously generated
    // file we need to manually revoke the object
    // URL to avoid memory leaks.
    if (metadataUrl !== null) {
      window.URL.revokeObjectURL(metadataUrl)
    }
    metadataUrl = window.URL.createObjectURL(data)
    return metadataUrl
  }

  /**
   * Generates the name of the original mp4 file (RapidVideo).
   * @param url
   * @returns {*}
   */
  function generateRVOriginal (url) {
    var re = /\/+[a-z0-9]+.mp4/gi
    var match = url.match(re)
    if (match.length > 0) {
      // since the regex us something like this
      // "/806FH0BFUQHP1LBGPWPZM.mp4" we need to
      // remove the starting slash
      return match[0].slice(1)
    } else {
      return ''
    }
  }

  /**
   * Generates a 3 digit episode id from the given
   * id. This is id is helpful while sorting files.
   * @param {string} num - The episode id
   * @returns {string} - The 3 digit episode id
   */
  function pad (num) {
    if (num.length >= 3) {
      return num
    } else {
      return ('000' + num).slice(-3)
    }
  }

  /**
   * This function does the following
   * 1. fetch the RapidVideo page
   * 2. regex match and get the video sources
   * 3. get the video links
   * @param {string} url - The RapidVideo url to download videos
   * @returns {Promise}
   */
  function getVideoLinksRV (url) {
    var re = /("sources": \[)(.*)(}])/g

    return new Promise(function (resolve, reject) {
      // We are using GM_xmlhttpRequest since we need to make
      // cross origin requests.
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
          try {
            var blob = response.responseText.match(re)[0]
            var parsed = JSON.parse('{' + blob + '}')
            // the parsed structure is like this
            // {
            //   sources: [
            //     {default: "true", file: "FILE_URL", label: "720p", res: "720"}
            //   ]
            // }
            resolve(parsed['sources'])
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
   * @returns {Promise}
   */
  function getGrabber (qParams) {
    return new Promise(function (resolve, reject) {
      var xhr = new window.XMLHttpRequest()
      xhr.open('GET', '/ajax/episode/info?' + qParams, true)
      xhr.onload = function () {
        // Some error codes don't trigger the
        // onerror. So we make sure that we only
        // parse the response text for 200.
        if (xhr.status === 200) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch (e) {
            // This is when there is an error
            // parsing the response text
            reject(e)
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
   * getting our IP flagged as bot. Once all the episodes are
   * done, and if the server was RapidVideo, a link to
   * download 'metadata.json' is added. This can then be used
   * by other programs or the user to rename the files.
   */
  function requeue () {
    if (dlEpisodeIds.length !== 0) {
      window.dlTimeout = setTimeout(processGrabber, 2000)
    } else {
      // Metadata only for RapidVideo
      if (dlServerType === 'RapidVideo') {
        // prepare the metadata
        metadata['timestamp'] = new Date().toISOString()
        metadata['server'] = dlServerType
        var a = document.createElement('a')
        a.href = createMetadataFile()
        a.id = 'grabber__metadata-link'
        a.appendChild(document.createTextNode('metadata.json'))
        a.download = 'metadata.json'
        statusContainer.appendChild(a)
      }

      clearTimeout(window.dlTimeout)
      dlInProgress = false
      grabberStatus.innerHTML = 'All done. The completed links are copied to your clipboard.'
      GM_setClipboard(dlAggregateLinks)
    }
  }

  /***
   * Handles the grabbing process.
   */
  function processGrabber () {
    var ep = dlEpisodeIds.shift()
    grabberStatus.innerHTML = 'Fetching ' + ep.num

    var data = {
      ts: ts,
      id: ep.id,
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
      .then(function (resp) {
        if (dlServerType === 'RapidVideo') {
          getVideoLinksRV(resp['target'])
            .then(function (resp) {
              dlAggregateLinks += resp[0]['file'] + '\n'
              // Metadata only for RapidVideo
              metadata.files.push({
                original: generateRVOriginal(resp[0]['file']),
                real: animeName.toLowerCase() + '-ep_' + ep.num + '-' + resp[0]['label'].toLowerCase() + '.mp4'
              })
              grabberStatus.innerHTML = 'Completed ' + ep.num
              requeue()
            })
            .catch(function () {
              grabberStatus.innerHTML = '<span class="grabber--fail">Failed ' + ep.num + '</span>'
              requeue()
            })
        }
      })
      .catch(function () {
        grabberStatus.innerHTML = '<span class="grabber--fail">Failed ' + ep.num + '</span>'
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
        dlEpisodeIds.push({
          num: pad(epLinks[i].dataset['base']),
          id: epLinks[i].dataset['id']
        })
      }
      if (!dlInProgress) {
        grabberStatus.innerHTML = 'starting grabber...'
        dlServerType = this.dataset['type']
        dlInProgress = true
        dlAggregateLinks = ''
        var mLink = document.getElementById('grabber__metadata-link')
        if (mLink) statusContainer.removeChild(mLink)
        // Metadata only for RapidVideo
        if (dlServerType === 'RapidVideo') metadata.files = []
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
