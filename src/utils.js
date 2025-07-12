import chalk from 'chalk'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

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
  console.log(`[${packageJson.name}] ${content}`)
}

/**
 * @param {string} content
 */
function successLog(content) {
  console.log(chalk.green(`[${packageJson.name}] ${content}`))
}

/**
 * @param {string} content
 */
function errorLog(content) {
  console.error(chalk.red(`[${packageJson.name}] ${content}`))
}

/**
 * @param {string} content
 */
function errorLogAndExit(content) {
  errorLog(content)
  process.exit(1)
}

export {
  containsChinese,
  log,
  successLog,
  errorLog,
  errorLogAndExit
}
