/* global GM_info, GM_setClipboard */
/* eslint prefer-arrow-callback: "error" */
/* eslint-env es6 */

import * as api from './api'
import applyStyle from './style'
import * as utils from './utils'

console.log('Grabber ' + GM_info.script.version + ' is now running!')

// Welcome folks! This is the main script for Grabber.
// Below are a few terminologies that you will find
// helpful.
// dl -> Download
// rv -> RapidVideo
// 9a -> 9anime

let dlInProgress = false // global switch to indicate dl status
let dlEpisodeIds = [] // list of id's currently being grabbed
let dlServerType = ''
let dlAggregateLinks = '' // stores all the grabbed links as a single string
let ts = document.getElementsByTagName('body')[0].dataset['ts'] // ts is needed to send API requests
let animeName = document.querySelectorAll('h1.title')[0].innerHTML
let metadata = {
  animeName: animeName,
  animeUrl: window.location.href,
  files: []
}

// Apply styles
applyStyle()

// Append the status bar
let servers = document.getElementById('servers')
let statusContainer = document.createElement('div')
statusContainer.classList.add('grabber__notification')
statusContainer.innerHTML =
  `<span>Grabber ★</span>
  <span>Quality:</span>
  <select id="grabber__quality">
      <option value="360p">360p</option>
      <option value="480p">480p</option>
      <option value="720p">720p</option>
      <option value="1080p">1080p</option>
  </select>
  <span>Status:</span>
  <div id="grabber__status">ready! Press Grab All to start.</div>`
servers.insertBefore(statusContainer, servers.firstChild)

/**
 * A small helper function to add a message on the status bar.
 * @param {string} message
 */
function status (message) {
  document.getElementById('grabber__status').innerHTML = message
}

/**
 * Prepares the metadata by adding some more relevant
 * keys, generates the metadata.json and appends it to
 * the status bar.
 */
function prepareMetadata () {
  metadata['timestamp'] = new Date().toISOString()
  metadata['server'] = dlServerType
  let a = document.createElement('a')
  a.href = utils.createMetadataFile(metadata)
  a.id = 'grabber__metadata-link'
  a.appendChild(document.createTextNode('metadata.json'))
  a.download = 'metadata.json'
  statusContainer.appendChild(a)
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
      prepareMetadata()
    }

    clearTimeout(window.dlTimeout)
    dlInProgress = false
    status('All done. The completed links are copied to your clipboard.')
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
  let ep = dlEpisodeIds.shift()
  status(`Fetching ${ep.num}`)

  let params = {
    ts: ts,
    id: ep.id,
    update: 0
  }

  api.grabber(params)
    .then(resp => {
      switch (dlServerType) {
        case 'RapidVideo':
          api.videoLinksRV(resp['target'])
            .then(resp => {
              dlAggregateLinks += resp[0]['file'] + '\n'
              let fileSafeName = utils.fileSafeString(`${animeName}-ep_${ep.num}-${resp[0]['label']}.mp4`)
              // Metadata only for RapidVideo
              metadata.files.push({
                original: api.rvOriginal(resp[0]['file']),
                real: fileSafeName
              })
              status('Completed ' + ep.num)
              requeue()
            })
            .catch(err => {
              console.debug(err)
              status(`<span class="grabber--fail">Failed ${ep.num}</span>`)
              requeue()
            })
          break

        case '9anime':
          let data = {
            ts: ts,
            id: resp['params']['id'],
            options: resp['params']['options'],
            token: resp['params']['token'],
            mobile: 0
          }
          api.videoLinks9a(data, resp['grabber'])
            .then(resp => {
              // resp is of the format
              // {data: [{file: '', label: '', type: ''}], error: null, token: ''}
              // data contains the files array.
              let data = resp['data']
              let quality = document.getElementById('grabber__quality').value /* preferred quality */
              for (let i = 0; i < data.length; i++) {
                // NOTE: this part is basically making sure that we only get
                // links for the quality we select. Not all of them. If the
                // preferred quality is not present it wont grab any.
                if (data[i]['label'] === quality) {
                  console.log('...')
                  let title = utils.fileSafeString(`${animeName}-ep_${ep.num}-${data[i]['label']}`)
                  dlAggregateLinks += `${data[i]['file']}?&title=${title}&type=video/${data[i]['type']}\n`
                }
              }
              status('Completed ' + ep.num)
              requeue()
            })
            .catch(err => {
              console.debug(err)
              status(`<span class="grabber--fail">Failed ${ep.num}</span>`)
              requeue()
            })
          break
      }
    })
    .catch(err => {
      console.debug(err)
      status(`<span class="grabber--fail">Failed ${ep.num}</span>`)
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
  let dlBtn = document.createElement('button')
  dlBtn.dataset['type'] = type
  dlBtn.classList.add('grabber__btn')
  dlBtn.appendChild(document.createTextNode('Grab All'))

  // 1> Click handler
  dlBtn.addEventListener('click', function () {
    let serverDiv = this.parentNode.parentNode
    let epLinks = serverDiv.getElementsByTagName('a')
    for (let i = 0; i < epLinks.length; i++) {
      dlEpisodeIds.push({
        num: utils.pad(epLinks[i].dataset['base']),
        id: epLinks[i].dataset['id']
      })
    }
    if (!dlInProgress) {
      status('starting grabber...')
      dlServerType = this.dataset['type']
      dlInProgress = true
      dlAggregateLinks = ''
      let mLink = document.getElementById('grabber__metadata-link')
      if (mLink) statusContainer.removeChild(mLink)
      // Metadata only for RapidVideo
      if (dlServerType === 'RapidVideo') metadata.files = []
      processGrabber()
    }
  })
  return dlBtn
}

// Attach the 'Grab All' button to RapidVideo for now.
let serverLabels = document.querySelectorAll('.server.row > label')
for (let i = 0; i < serverLabels.length; i++) {
  // Remove the leading and trailing whitespace
  // from the server labels.
  let serverLabel = serverLabels[i].innerText.trim()
  if (/RapidVideo/i.test(serverLabel)) {
    serverLabels[i].appendChild(generateDlBtn('RapidVideo'))
  } else if (/Server\s+F/i.test(serverLabel)) {
    serverLabels[i].appendChild(generateDlBtn('9anime'))
  }
}
