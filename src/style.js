/* global GM_addStyle */

let styles =
  `
  #grabber__metadata-link {
      margin-left: 5px;
  }
  .grabber--fail {
      color: indianred;
  }
  .grabber__btn {
      border: 1px solid #555;
      border-radius: 2px;
      background-color: #16151c;
      color: #888;
      padding: 1px 5px 1px 5px;
      margin-top: 5px;
  }
  .grabber__btn:hover {
      background-color: #111111;
  }
  .grabber__btn:active {
      background-color: #151515;
  }

  .grabber__btn:disabled {
      color: #888;
      background-color: #222;
  }

  .grabber__notification {
      padding: 0 10px;
      margin-bottom: 10px;
      color: #888;
  }
  .grabber__notification > span {
      display: inline-block;
      font-weight: 500;
  }
  .grabber__notification > #grabber__status {
      margin-left: 5px;
      display: inline-block;
      color: #888;
  }
  #grabber__quality {
      background: inherit;
      border-radius: 2px;
      color: #888;
      border: 1px solid #555;
  }

  .links_header {
    color: #5e5e5e;
  }
  #grabber__links-box {
    display: none;
    border-bottom: 1px solid #1e1c25;
    padding-bottom: 10px;
  }
  #grabber__links {
     width: 100%;
     height: 200px;
     background: #0f0e13;
     color: #9a9a9a;
     border: 5px solid #1e1c25;
     border-radius: 5px;
     margin-top: 5px;
     padding: 10px;
     resize: none;
  }

  #grabber__quality:disabled {
      background: #222;
      color: #888;
  }
  #grabber__quality > option {
      background: #16151c;
  }
  `
export default function applyStyle () {
  GM_addStyle(styles)
}
