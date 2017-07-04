// ==UserScript==
// @name        Grabber
// @namespace   https://github.com/lap00zza/
// @version     0.5.1
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
  // TODO: convert anime names to Title Case
  // TODO: add a option to select quality for 9anime server.
  // right now it just grabs everything.

  console.log('Grabber ' + GM_info.script.version + ' is now running!')
  var dlInProgress = false // global switch to indicate dl status
  var dlEpisodeIds = [] // list of id's currently being grabbed
  var dlServerType = ''
  var dlAggregateLinks = '' // stores all the grabbed links as a single string
  var ts = document.getElementsByTagName('body')[0].dataset['ts'] // ts is needed to send API requests
  var animeName = document.querySelectorAll('h1.title')[0].innerText
  // metadata stores relevant information about the
  // grabbed videos. It is especially helpful in
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
  // Utility functions
  /**
   * Just as the function name says!
   * We remove the illegal characters.
   * @param filename
   * @returns {string}
   */
  function generateFileSafeString (filename) {
    var re = /[\\/<>*?:"|]/gi
    return filename.replace(re, '')
  }

  // metadataUrl is a part of createMetadataFile
  var metadataUrl = null
  /**
   * This functions generates the blob for the `metadata.json`
   * file and returns an url to this blob.
   * @returns {string}
   */
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
   * Generate the query parameters from an object.
   * @param {object} params
   * @returns {string}
   */
  function generateQParams (params) {
    var qParams = ''
    var dKeys = Object.keys(params)
    for (var i = 0; i < dKeys.length; i++) {
      if (i === 0) {
        qParams += dKeys[i] + '=' + params[dKeys[i]]
      } else {
        qParams += '&' + dKeys[i] + '=' + params[dKeys[i]]
      }
    }
    return qParams
  }

  // parser is a part of getURL
  var parser = document.createElement('a')
  /**
   * Get a url from a uri string.
   * Credits to jlong for this implementation idea:
   * https://gist.github.com/jlong/2428561
   * @param {string} uriString
   * @returns {string}
   */
  function getURL (uriString) {
    parser.href = uriString
    return parser.protocol + '//' + parser.hostname + parser.pathname
  }

  /**
   * Converts the searchParams in then uri string to
   * an object.
   * @param {string} uriString
   * @returns {object}
   */
  function searchParams2Obj (uriString) {
    parser.href = uriString
    // HTMLHyperlinkElementUtils.search returns a search
    // string, also called a query string containing a '?'
    // followed by the parameters of the URL. We don't need
    // the '?' so we slice it.
    var searchParams = parser.search.slice(1)
    // All search params are delimited by '&'.
    // So we split them into an array and iterate
    // through it to get the keys and values.
    var search = searchParams.split('&')
    var searchObj = {}
    for (var i = 0; i < search.length; i++) {
      var searchSplit = search[i].split('=')
      if (searchSplit[0] !== '' && searchSplit[1] !== undefined) {
        searchObj[searchSplit[0]] = searchSplit[1]
      }
    }
    return searchObj
  }

  /**
   * A simple helper function that merges 2 objects.
   * @param {object} obj1
   * @param {object} obj2
   * @returns {object}
   */
  function mergeObject (obj1, obj2) {
    var obj3 = {}
    for (var a in obj1) {
      if (obj1.hasOwnProperty(a)) {
        obj3[a] = obj1[a]
      }
    }
    for (var b in obj2) {
      if (obj2.hasOwnProperty(b)) {
        obj3[b] = obj2[b]
      }
    }
    return obj3
  }

  /********************************************************************************************************************/
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
   * This function does the following
   * 1. fetch the RapidVideo page
   * 2. regex match and get the video sources
   * 3. get the video links
   * @param {string} url - The RapidVideo url to grab videos
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
   * Fetch 9anime video links for Server F4 etc.
   * @param {string} url
   *    The 9anime url to grab videos
   * @param {object} params
   *    A list of query parameters to send to the API.
   * @returns {Promise}
   */
  function getVideoLinks9a (url, params) {
    return new Promise(function (resolve, reject) {
      var xhr = new window.XMLHttpRequest()
      xhr.open('GET', url + '?' + generateQParams(params), true)
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
   * Get the grabber info from the 9anime API.
   * @param {object} params
   *    A list of query parameters to send to the API.
   * @returns {Promise}
   */
  function getGrabber (params) {
    return new Promise(function (resolve, reject) {
      var xhr = new window.XMLHttpRequest()
      xhr.open('GET', '/ajax/episode/info' + '?' + generateQParams(params), true)
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
   * This is the main function that handles the
   * entire grabbing process. It is scheduled to
   * run every 2 seconds by requeue.
   * @todo: refactor this function and make it cleaner
   */
  function processGrabber () {
    var ep = dlEpisodeIds.shift()
    grabberStatus.innerHTML = 'Fetching ' + ep.num

    var params = {
      ts: ts,
      id: ep.id,
      update: 0
    }
    params['_'] = generateToken(params)

    getGrabber(params)
      .then(function (resp) {
        switch (dlServerType) {
          case 'RapidVideo':
            getVideoLinksRV(resp['target'])
              .then(function (resp) {
                dlAggregateLinks += resp[0]['file'] + '\n'
                var fileSafeName = generateFileSafeString(animeName + '-ep_' + ep.num + '-' + resp[0]['label']) + '.mp4'
                // Metadata only for RapidVideo
                metadata.files.push({
                  original: generateRVOriginal(resp[0]['file']),
                  real: fileSafeName.toLowerCase()
                })
                grabberStatus.innerHTML = 'Completed ' + ep.num
                requeue()
              })
              .catch(function (e) {
                console.debug(e)
                grabberStatus.innerHTML = '<span class="grabber--fail">Failed ' + ep.num + '</span>'
                requeue()
              })
            break

          case '9anime':
            var data = {
              ts: ts,
              id: resp['params']['id'],
              options: resp['params']['options'],
              token: resp['params']['token'],
              mobile: 0
            }
            var url = getURL(resp['grabber'])
            // The grabber url has additional search params
            // we need to add those to 'data' before generating
            // the token.
            var sParams = searchParams2Obj(resp['grabber'])
            var merged = mergeObject(data, sParams)
            var initState = s(a(DD + url, ''))
            merged['_'] = generateToken(merged, initState)
            getVideoLinks9a(url, merged)
              .then(function (resp) {
                // resp is of the format
                // {data: [{file: '', label: '', type: ''}], error: null, token: ''}
                // data contains the files array.
                var data = resp['data']
                for (var i = 0; i < data.length; i++) {
                  var title = generateFileSafeString(animeName + '-ep_' + ep.num + '-' + data[i]['label'])
                  dlAggregateLinks += data[i]['file'] + '?&title=' + title.toLowerCase() +
                    '&type=video/' + data[i]['type'] + '\n'
                }
                grabberStatus.innerHTML = 'Completed ' + ep.num
                requeue()
              })
              .catch(function (e) {
                console.debug(e)
                grabberStatus.innerHTML = '<span class="grabber--fail">Failed ' + ep.num + '</span>'
                requeue()
              })
            break
        }
      })
      .catch(function () {
        grabberStatus.innerHTML = '<span class="grabber--fail">Failed ' + ep.num + '</span>'
        requeue()
      })
  }

  /***
   * Generates a nice looking 'Grab All' button that are
   * added below the server labels.
   * @param {string} type
   *    The server type to generate this button for. Example:
   *    RapidVideo, Openload etc. Currently only support
   *    grabbing RapidVideo links.
   * @returns {Element}
   *    'Grab All' button for specified server
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

  // Attach the 'Grab All' button to RapidVideo for now.
  var serverLabels = document.querySelectorAll('.server.row > label')
  for (var i = 0; i < serverLabels.length; i++) {
    // Remove the leading and trailing whitespace
    // from the server labels.
    var serverLabel = serverLabels[i].innerText.trim()
    if (/RapidVideo/i.test(serverLabel)) {
      serverLabels[i].appendChild(generateDlBtn('RapidVideo'))
    } else if (/Server\s+F/i.test(serverLabel)) {
      serverLabels[i].appendChild(generateDlBtn('9anime'))
    }
  }
})()
