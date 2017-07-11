// ==UserScript==
// @name        Grabber
// @namespace   https://github.com/lap00zza/
// @version     0.7.0
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

/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fileSafeString = fileSafeString;
exports.createMetadataFile = createMetadataFile;
exports.pad = pad;
exports.qParams = qParams;
exports.getURL = getURL;
exports.searchParams2Obj = searchParams2Obj;
exports.mergeObject = mergeObject;
exports.ajaxGet = ajaxGet;
/* eslint prefer-arrow-callback: "error" */
/* eslint-env es6 */

/**
 * Just as the function name says!
 * We remove the illegal characters.
 * @param filename
 * @returns {string}
 */
function fileSafeString(filename) {
  var re = /[\\/<>*?:"|]/gi;
  return filename.replace(re, '');
}

// metadataUrl is a part of createMetadataFile
var metadataUrl = null;
/**
 * This functions generates the blob for the `metadata.json`
 * file and returns an url to this blob.
 * @param {object} metadata
 * @returns {*}
 */
function createMetadataFile(metadata) {
  var data = new window.Blob([JSON.stringify(metadata, null, '\t')], { type: 'text/json' });
  // If we are replacing a previously generated
  // file we need to manually revoke the object
  // URL to avoid memory leaks.
  if (metadataUrl !== null) {
    window.URL.revokeObjectURL(metadataUrl);
  }
  metadataUrl = window.URL.createObjectURL(data);
  return metadataUrl;
}

/**
 * Generates a 3 digit episode id from the given
 * id. This is id is helpful while sorting files.
 * @param {string} num - The episode id
 * @returns {string} - The 3 digit episode id
 */
function pad(num) {
  if (num.length >= 3) {
    return num;
  } else {
    return ('000' + num).slice(-3);
  }
}

/**
 * Generate the query parameter string from an
 * object.
 * @param {object} params
 * @returns {string}
 */
function qParams(params) {
  var qParams = '';
  var dKeys = Object.keys(params);
  for (var i = 0; i < dKeys.length; i++) {
    if (i === 0) {
      qParams += dKeys[i] + '=' + params[dKeys[i]];
    } else {
      qParams += '&' + dKeys[i] + '=' + params[dKeys[i]];
    }
  }
  return qParams;
}

// parser is a part of getURL
var parser = exports.parser = document.createElement('a');
/**
 * Get a url from a uri string.
 * Credits to jlong for this implementation idea:
 * https://gist.github.com/jlong/2428561
 * @param {string} uriString
 * @returns {string}
 */
function getURL(uriString) {
  parser.href = uriString;
  return parser.protocol + '//' + parser.hostname + parser.pathname;
}

/**
 * Converts the searchParams in then uri string to
 * an object.
 * @param {string} uriString
 * @returns {object}
 */
function searchParams2Obj(uriString) {
  parser.href = uriString;
  // HTMLHyperlinkElementUtils.search returns a search
  // string, also called a query string containing a '?'
  // followed by the parameters of the URL. We don't need
  // the '?' so we slice it.
  var searchParams = parser.search.slice(1);
  // All search params are delimited by '&'.
  // So we split them into an array and iterate
  // through it to get the keys and values.
  var search = searchParams.split('&');
  var searchObj = {};
  for (var i = 0; i < search.length; i++) {
    var searchSplit = search[i].split('=');
    if (searchSplit[0] !== '' && searchSplit[1] !== undefined) {
      searchObj[searchSplit[0]] = searchSplit[1];
    }
  }
  return searchObj;
}

/**
 * A simple helper function that merges 2 objects.
 * @param {object} obj1
 * @param {object} obj2
 * @returns {object}
 */
function mergeObject(obj1, obj2) {
  var obj3 = {};
  for (var a in obj1) {
    if (obj1.hasOwnProperty(a)) {
      obj3[a] = obj1[a];
    }
  }
  for (var b in obj2) {
    if (obj2.hasOwnProperty(b)) {
      obj3[b] = obj2[b];
    }
  }
  return obj3;
}

/**
 * Promise based AJAX Get.
 * @param {string} url
 * @param {object} params
 * @returns {Promise}
 */
function ajaxGet(url, params) {
  return new Promise(function (resolve, reject) {
    var xhr = new window.XMLHttpRequest();
    xhr.open('GET', url + '?' + qParams(params), true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          resolve(xhr.responseText);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(xhr.statusText);
      }
    };
    xhr.onerror = function () {
      reject(xhr.statusText);
    };
    xhr.send();
  });
}

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _api = __webpack_require__(2);

var api = _interopRequireWildcard(_api);

var _style = __webpack_require__(3);

var _style2 = _interopRequireDefault(_style);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

console.log('Grabber ' + GM_info.script.version + ' is now running!');

// Welcome folks! This is the main script for Grabber.
// Below are a few terminologies that you will find
// helpful.
// dl -> Download
// rv -> RapidVideo
// 9a -> 9anime

/* global GM_info, GM_setClipboard */
/* eslint prefer-arrow-callback: "error" */
/* eslint-env es6 */

var dlInProgress = false; // global switch to indicate dl status
var dlEpisodeIds = []; // list of id's currently being grabbed
var dlServerType = '';
var dlAggregateLinks = ''; // stores all the grabbed links as a single string
var dlQuality = '360p'; /* preferred quality */
var ts = document.getElementsByTagName('body')[0].dataset['ts']; // ts is needed to send API requests
var animeName = document.querySelectorAll('h1.title')[0].innerHTML;
var metadata = {
  animeName: animeName,
  animeUrl: window.location.href,
  files: []

  // Apply styles
};(0, _style2.default)();

// Append the status bar
var servers = document.getElementById('servers');
var statusContainer = document.createElement('div');
statusContainer.classList.add('grabber__notification');
statusContainer.innerHTML = '<span>Grabber \u2605</span>\n  <span>Quality:</span>\n  <select id="grabber__quality">\n      <option value="360p">360p</option>\n      <option value="480p">480p</option>\n      <option value="720p">720p</option>\n      <option value="1080p">1080p</option>\n  </select>\n  <span>Status:</span>\n  <div id="grabber__status">ready! Press Grab All to start.</div>';
servers.insertBefore(statusContainer, servers.firstChild);

/**
 * A small helper function to add a message on the status bar.
 * @param {string} message
 */
function status(message) {
  document.getElementById('grabber__status').innerHTML = message;
}

/**
 * Prepares the metadata by adding some more relevant
 * keys, generates the metadata.json and appends it to
 * the status bar.
 */
function prepareMetadata() {
  metadata['timestamp'] = new Date().toISOString();
  metadata['server'] = dlServerType;
  var a = document.createElement('a');
  a.href = utils.createMetadataFile(metadata);
  a.id = 'grabber__metadata-link';
  a.appendChild(document.createTextNode('metadata.json'));
  a.download = 'metadata.json';
  statusContainer.appendChild(a);
}

/**
 * This function requeue's the processGrabber to run after
 * 2 seconds to avoid overloading the 9anime API and/or
 * getting our IP flagged as bot. Once all the episodes are
 * done, and if the server was RapidVideo, a link to
 * download 'metadata.json' is added. This can then be used
 * by other programs or the user to rename the files.
 */
function requeue() {
  if (dlEpisodeIds.length !== 0) {
    window.dlTimeout = setTimeout(processGrabber, 2000);
  } else {
    // Metadata only for RapidVideo
    if (dlServerType === 'RapidVideo') {
      // prepare the metadata
      prepareMetadata();
    }

    clearTimeout(window.dlTimeout);
    dlInProgress = false;
    status('All done. The completed links are copied to your clipboard.');
    GM_setClipboard(dlAggregateLinks);
  }
}

/***
 * This is the main function that handles the
 * entire grabbing process. It is scheduled to
 * run every 2 seconds by requeue.
 * @todo: refactor this function and make it cleaner
 */
function processGrabber() {
  var ep = dlEpisodeIds.shift();
  status('Fetching ' + ep.num);

  var params = {
    ts: ts,
    id: ep.id,
    update: 0
  };

  api.grabber(params).then(function (resp) {
    switch (dlServerType) {
      case 'RapidVideo':
        api.videoLinksRV(resp['target']).then(function (resp) {
          dlAggregateLinks += resp[0]['file'] + '\n';
          var fileSafeName = utils.fileSafeString(animeName + '-ep_' + ep.num + '-' + resp[0]['label'] + '.mp4');
          // Metadata only for RapidVideo
          metadata.files.push({
            original: api.rvOriginal(resp[0]['file']),
            real: fileSafeName
          });
          status('Completed ' + ep.num);
          requeue();
        }).catch(function (err) {
          console.debug(err);
          status('<span class="grabber--fail">Failed ' + ep.num + '</span>');
          requeue();
        });
        break;

      case '9anime':
        var data = {
          ts: ts,
          id: resp['params']['id'],
          options: resp['params']['options'],
          token: resp['params']['token'],
          mobile: 0
        };
        api.videoLinks9a(data, resp['grabber']).then(function (resp) {
          // resp is of the format
          // {data: [{file: '', label: '', type: ''}], error: null, token: ''}
          // data contains the files array.
          var data = resp['data'];
          for (var i = 0; i < data.length; i++) {
            // NOTE: this part is basically making sure that we only get
            // links for the quality we select. Not all of them. If the
            // preferred quality is not present it wont grab any.
            if (data[i]['label'] === dlQuality) {
              console.log('...');
              var title = utils.fileSafeString(animeName + '-ep_' + ep.num + '-' + data[i]['label']);
              dlAggregateLinks += data[i]['file'] + '?&title=' + title + '&type=video/' + data[i]['type'] + '\n';
            }
          }
          status('Completed ' + ep.num);
          requeue();
        }).catch(function (err) {
          console.debug(err);
          status('<span class="grabber--fail">Failed ' + ep.num + '</span>');
          requeue();
        });
        break;
    }
  }).catch(function (err) {
    console.debug(err);
    status('<span class="grabber--fail">Failed ' + ep.num + '</span>');
    requeue();
  });
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
function generateDlBtn(type) {
  var dlBtn = document.createElement('button');
  dlBtn.dataset['type'] = type;
  dlBtn.classList.add('grabber__btn');
  dlBtn.appendChild(document.createTextNode('Grab All'));

  // 1> Click handler
  dlBtn.addEventListener('click', function () {
    var serverDiv = this.parentNode.parentNode;
    var epLinks = serverDiv.getElementsByTagName('a');
    for (var i = 0; i < epLinks.length; i++) {
      dlEpisodeIds.push({
        num: utils.pad(epLinks[i].dataset['base']),
        id: epLinks[i].dataset['id']
      });
    }
    if (!dlInProgress) {
      status('starting grabber...');
      dlServerType = this.dataset['type'];
      dlInProgress = true;
      dlAggregateLinks = '';
      dlQuality = document.getElementById('grabber__quality').value;
      var mLink = document.getElementById('grabber__metadata-link');
      if (mLink) statusContainer.removeChild(mLink);
      // Metadata only for RapidVideo
      if (dlServerType === 'RapidVideo') metadata.files = [];
      processGrabber();
    }
  });
  return dlBtn;
}

// Attach the 'Grab All' button to RapidVideo for now.
var serverLabels = document.querySelectorAll('.server.row > label');
for (var i = 0; i < serverLabels.length; i++) {
  // Remove the leading and trailing whitespace
  // from the server labels.
  var serverLabel = serverLabels[i].innerText.trim();
  if (/RapidVideo/i.test(serverLabel)) {
    serverLabels[i].appendChild(generateDlBtn('RapidVideo'));
  } else if (/Server\s+F/i.test(serverLabel)) {
    serverLabels[i].appendChild(generateDlBtn('9anime'));
  }
}

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateToken = generateToken;
exports.grabber = grabber;
exports.videoLinks9a = videoLinks9a;
exports.videoLinksRV = videoLinksRV;
exports.rvOriginal = rvOriginal;

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// The parts/functions marked as [*] are part of
// 9anime encryption scheme. If they make no sense
// (and they probably should not anyway), just skip
// to the parts after it.

var DD = 'gIXCaNh'; // This might change in the future

// [*]
/* global GM_xmlhttpRequest */
/* eslint prefer-arrow-callback: "error" */
/* eslint-env es6 */

function s(t) {
  var e = void 0;
  var i = 0;
  for (e = 0; e < t.length; e++) {
    i += t.charCodeAt(e) * e + e;
  }
  return i;
}

// [*]
function a(t, e) {
  var i = void 0;
  var n = 0;
  for (i = 0; i < Math.max(t.length, e.length); i++) {
    n += i < e.length ? e.charCodeAt(i) : 0;
    n += i < t.length ? t.charCodeAt(i) : 0;
  }
  return Number(n).toString(16);
}

// [*]
function generateToken(data, initialState) {
  var keys = Object.keys(data);
  var _ = s(DD) + (initialState || 0);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var trans = a(DD + key, data[key].toString());
    _ += s(trans);
  }
  return _;
}

/**
 * Get the grabber info from the 9anime API.
 * @param {object} params
 *    A list of query parameters to send to the API.
 * @returns {Promise}
 */
function grabber(params) {
  params['_'] = generateToken(params);

  return new Promise(function (resolve, reject) {
    utils.ajaxGet('/ajax/episode/info', params).then(function (resp) {
      resolve(JSON.parse(resp));
    }).catch(function (err) {
      reject(err);
    });
  });
}

/**
 * Fetch 9anime video links for Server F4 etc.
 *    The 9anime url to grab videos
 * @param {object} data
 *    A list of query parameters to send to the API.
 * @param {string} grabberUri
 * @returns {Promise}
 */
function videoLinks9a(data, grabberUri) {
  var url = utils.getURL(grabberUri);
  // The grabber url has additional search params
  // we need to add those to 'data' before generating
  // the token.
  var sParams = utils.searchParams2Obj(grabberUri);
  var merged = utils.mergeObject(data, sParams);
  var initState = s(a(DD + url, ''));
  merged['_'] = generateToken(merged, initState);

  return new Promise(function (resolve, reject) {
    utils.ajaxGet(url, merged).then(function (resp) {
      resolve(JSON.parse(resp));
    }).catch(function (err) {
      reject(err);
    });
  });
}

/**
 * This function does the following
 * 1. fetch the RapidVideo page
 * 2. regex match and get the video sources
 * 3. get the video links
 * @param {string} url - The RapidVideo url to grab videos
 * @returns {Promise}
 */
function videoLinksRV(url) {
  var re = /("sources": \[)(.*)(}])/g;

  return new Promise(function (resolve, reject) {
    // We are using GM_xmlhttpRequest since we need to make
    // cross origin requests.
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function onload(response) {
        try {
          var blob = response.responseText.match(re)[0];
          var parsed = JSON.parse('{' + blob + '}');
          // the parsed structure is like this
          // {
          //   sources: [
          //     {default: "true", file: "FILE_URL", label: "720p", res: "720"}
          //   ]
          // }
          resolve(parsed['sources']);
        } catch (e) {
          reject(e);
        }
      },
      onerror: function onerror(response) {
        reject(response.responseText);
      }
    });
  });
}

/**
 * Generates the name of the original mp4 file (RapidVideo).
 * @param {string} url
 * @returns {*}
 */
function rvOriginal(url) {
  var re = /\/+[a-z0-9]+.mp4/gi;
  var match = url.match(re);
  if (match.length > 0) {
    // since the regex us something like this
    // "/806FH0BFUQHP1LBGPWPZM.mp4" we need to
    // remove the starting slash
    return match[0].slice(1);
  } else {
    return '';
  }
}

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = applyStyle;
/* global GM_addStyle */

var styles = ['#grabber__metadata-link {', '   margin-left: 5px;}', '.grabber--fail {', '   color: indianred;}', '.grabber__btn {', '    border: 1px solid #555;', '    border-radius: 2px;', '    background-color: #16151c;', '    margin-top: 5px;}', '.grabber__btn:hover {', '    background-color: #111111;}', '.grabber__btn:active {', '    background-color: #151515;}', '.grabber__notification {', '   padding: 0 10px;', '   margin-bottom: 10px;}', '.grabber__notification > span {', '   display: inline-block;', '   font-weight: 500;}', '.grabber__notification > #grabber__status {', '   margin-left: 5px;', '   display: inline-block;', '   color: #888;}', '#grabber__quality {', '   background: inherit;' + '   border: 0;}', 'grabber__quality > option {', '   background: #16151c;}'];
function applyStyle() {
  GM_addStyle(styles.join(''));
}

/***/ })
/******/ ]);