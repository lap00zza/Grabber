const utils = require('../src/utils')

// autoFallback
test('fallback if there a lower quality', () => {
  let mockData1 = [
    {label: '360p', file: '1'},
    {label: '480p', file: '2'}
  ]
  expect(utils.autoFallback('720p', mockData1)).toBe(mockData1[1])

  let mockData2 = [
    {label: '360p', file: '1'},
    {label: '480p', file: '2'},
    {label: '1080p', file: '2'}
  ]
  expect(utils.autoFallback('720p', mockData2)).toBe(mockData2[1])

  let mockData3 = [
    {label: '360p', file: '1'},
    {label: '480p', file: '2'},
    {label: '720p', file: '2'},
    {label: '1080p', file: '2'}
  ]
  expect(utils.autoFallback('720p', mockData3)).toBe(mockData3[2])
})

test('dont fallback when no lower quality', () => {
  let mockData1 = [{label: '360p', file: '1'}, {label: '480p', file: '2'}]
  expect(utils.autoFallback('360p', mockData1)).toBeNull()
})

test('dont fallback if invalid preferred quality', () => {
  let mockData1 = [{label: '360p', file: '1'}, {label: '480p', file: '2'}]
  expect(utils.autoFallback('555p', mockData1)).toBeNull()
})
