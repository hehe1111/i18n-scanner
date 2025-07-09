const chalk = require('chalk')
const package = require('../package.json')

/**
 * @param {string} text - 待处理的目标字符串
 * @returns {boolean}
 */
function containsChinese(text) {
  // Chinese character Unicode range
  const chineseRegex = /[\u4e00-\u9fff]/
  return chineseRegex.test(text)
}

/**
 * @param {string} content
 */
function log(content) {
  console.log(`[${package.name}] ${content}`)
}

/**
 * @param {string} content
 */
function successLog(content) {
  console.log(chalk.green(`[${package.name}] ${content}`))
}

/**
 * @param {string} content
 */
function errorLog(content) {
  console.error(chalk.red(`[${package.name}] ${content}`))
}

/**
 * @param {string} content
 */
function errorLogAndExit(content) {
  errorLog(content)
  process.exit(1)
}

module.exports = {
  containsChinese,
  log,
  successLog,
  errorLog,
  errorLogAndExit
}
