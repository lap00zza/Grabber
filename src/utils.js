/* eslint prefer-arrow-callback: "error" */
/* eslint-env es6 */

/**
 * Just as the function name says!
 * We remove the illegal characters.
 * @param filename
 * @returns {string}
 */
export function fileSafeString (filename) {
  let re = /[\\/<>*?:"|]/gi
  return filename.replace(re, '')
}

// metadataUrl is a part of createMetadataFile
let metadataUrl = null
/**
 * This functions generates the blob for the `metadata.json`
 * file and returns an url to this blob.
 * @param {object} metadata
 * @returns {*}
 */
export function createMetadataFile (metadata) {
  let data = new window.Blob([JSON.stringify(metadata, null, '\t')], {type: 'text/json'})
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
export function pad (num) {
  if (num.length >= 3) {
    return num
  } else {
    return ('000' + num).slice(-3)
  }
}

/**
 * Generate the query parameter string from an
 * object.
 * @param {object} params
 * @returns {string}
 */
export function qParams (params) {
  let qParams = ''
  let dKeys = Object.keys(params)
  for (let i = 0; i < dKeys.length; i++) {
    if (i === 0) {
      qParams += dKeys[i] + '=' + params[dKeys[i]]
    } else {
      qParams += '&' + dKeys[i] + '=' + params[dKeys[i]]
    }
  }
  return qParams
}

// parser is a part of getURL
export let parser = document.createElement('a')
/**
 * Get a url from a uri string.
 * Credits to jlong for this implementation idea:
 * https://gist.github.com/jlong/2428561
 * @param {string} uriString
 * @returns {string}
 */
export function getURL (uriString) {
  parser.href = uriString
  return parser.protocol + '//' + parser.hostname + parser.pathname
}

/**
 * Converts the searchParams in then uri string to
 * an object.
 * @param {string} uriString
 * @returns {object}
 */
export function searchParams2Obj (uriString) {
  parser.href = uriString
  // HTMLHyperlinkElementUtils.search returns a search
  // string, also called a query string containing a '?'
  // followed by the parameters of the URL. We don't need
  // the '?' so we slice it.
  let searchParams = parser.search.slice(1)
  // All search params are delimited by '&'.
  // So we split them into an array and iterate
  // through it to get the keys and values.
  let search = searchParams.split('&')
  let searchObj = {}
  for (let i = 0; i < search.length; i++) {
    let searchSplit = search[i].split('=')
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
export function mergeObject (obj1, obj2) {
  let obj3 = {}
  for (let a in obj1) {
    if (obj1.hasOwnProperty(a)) {
      obj3[a] = obj1[a]
    }
  }
  for (let b in obj2) {
    if (obj2.hasOwnProperty(b)) {
      obj3[b] = obj2[b]
    }
  }
  return obj3
}

/**
 * Promise based AJAX Get.
 * @param {string} url
 * @param {object} params
 * @returns {Promise}
 */
export function ajaxGet (url, params) {
  return new Promise((resolve, reject) => {
    let xhr = new window.XMLHttpRequest()
    xhr.open('GET', url + '?' + qParams(params), true)
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          resolve(xhr.responseText)
        } catch (e) {
          reject(e)
        }
      } else {
        reject(xhr.statusText)
      }
    }
    xhr.onerror = function () {
      reject(xhr.statusText)
    }
    xhr.send()
  })
}

// --- Implementation of fallback quality ---
const quality = {
  0: '360p',
  1: '480p',
  2: '720p',
  3: '1080p'
}

const qualityReverseLookup = {
  '360p': 0,
  '480p': 1,
  '720p': 2,
  '1080p': 3
}

export function autoFallback (pref, episodes) {
  // start determines from what quality we
  // start falling back. Default is from
  // 1080p.
  if (!qualityReverseLookup[pref]) {
    return null
  }
  let start = qualityReverseLookup[pref]

  // i is for indexing "quality". Since there
  // are only 4 possible value we start from
  // "start" to 0.
  for (let i = start; i >= 0; i--) {
    // for each "quality" we loop through episodes
    // and see if we find a suitable match.
    for (let j = 0; j < episodes.length; j++) {
      if (episodes[j]['label'] === quality[i]) {
        return episodes[j]
      }
    }
  }

  // Meaning fallback failed
  return null
}
