/* global GM_addStyle */

let styles = [
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
  '   color: #888;}',
  '#grabber__quality {',
  '   background: inherit;' +
  '   border: 0;}',
  'grabber__quality > option {',
  '   background: #16151c;}'
]
export default function applyStyle () {
  GM_addStyle(styles.join(''))
}
