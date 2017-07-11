/* global GM_xmlhttpRequest */
/* eslint prefer-arrow-callback: "error" */
/* eslint-env es6 */

import * as utils from './utils'

// The parts/functions marked as [*] are part of
// 9anime encryption scheme. If they make no sense
// (and they probably should not anyway), just skip
// to the parts after it.

const DD = 'gIXCaNh' // This might change in the future

// [*]
function s (t) {
  let e
  let i = 0
  for (e = 0; e < t.length; e++) {
    i += t.charCodeAt(e) * e + e
  }
  return i
}

// [*]
function a (t, e) {
  let i
  let n = 0
  for (i = 0; i < Math.max(t.length, e.length); i++) {
    n += i < e.length ? e.charCodeAt(i) : 0
    n += i < t.length ? t.charCodeAt(i) : 0
  }
  return Number(n).toString(16)
}

// [*]
export function generateToken (data, initialState) {
  let keys = Object.keys(data)
  let _ = s(DD) + (initialState || 0)
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i]
    let trans = a(DD + key, data[key].toString())
    _ += s(trans)
  }
  return _
}

/**
 * Get the grabber info from the 9anime API.
 * @param {object} params
 *    A list of query parameters to send to the API.
 * @returns {Promise}
 */
export function grabber (params) {
  params['_'] = generateToken(params)

  return new Promise((resolve, reject) => {
    utils.ajaxGet('/ajax/episode/info', params)
      .then(resp => {
        resolve(JSON.parse(resp))
      })
      .catch(err => {
        reject(err)
      })
  })
}

/**
 * Fetch 9anime video links for Server F4 etc.
 *    The 9anime url to grab videos
 * @param {object} data
 *    A list of query parameters to send to the API.
 * @param {string} grabberUri
 * @returns {Promise}
 */
export function videoLinks9a (data, grabberUri) {
  let url = utils.getURL(grabberUri)
  // The grabber url has additional search params
  // we need to add those to 'data' before generating
  // the token.
  let sParams = utils.searchParams2Obj(grabberUri)
  let merged = utils.mergeObject(data, sParams)
  let initState = s(a(DD + url, ''))
  merged['_'] = generateToken(merged, initState)

  return new Promise((resolve, reject) => {
    utils.ajaxGet(url, merged)
      .then(resp => {
        resolve(JSON.parse(resp))
      })
      .catch(err => {
        reject(err)
      })
  })
}

/**
 * This function does the following
 * 1. fetch the RapidVideo page
 * 2. regex match and get the video sources
 * 3. get the video links
 * @param {string} url - The RapidVideo url to grab videos
 * @returns {Promise}
 */
export function videoLinksRV (url) {
  let re = /("sources": \[)(.*)(}])/g

  return new Promise((resolve, reject) => {
    // We are using GM_xmlhttpRequest since we need to make
    // cross origin requests.
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function (response) {
        try {
          let blob = response.responseText.match(re)[0]
          let parsed = JSON.parse('{' + blob + '}')
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
 * Generates the name of the original mp4 file (RapidVideo).
 * @param {string} url
 * @returns {*}
 */
export function rvOriginal (url) {
  let re = /\/+[a-z0-9]+.mp4/gi
  let match = url.match(re)
  if (match.length > 0) {
    // since the regex us something like this
    // "/806FH0BFUQHP1LBGPWPZM.mp4" we need to
    // remove the starting slash
    return match[0].slice(1)
  } else {
    return ''
  }
}
