const fse = require('fs-extra')
const { parse } = require('@vue/compiler-dom')
const prettier = require('prettier')
const { traverse } = require('./template-ast-traverse')
const { VueTemplateASTPrinter } = require('./template-ast-printer')
const i18nScan = require('../i18n-scan')
const prettierConfig = require('../prettier-config')

/**
 * @param {Object} params
 * @param {string} params.filePath
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 */
module.exports = async function handleVueSFC({ filePath, pluginOptions }) {
  const encoding = { encoding: 'utf-8' }
  let content = fse.readFileSync(filePath, encoding)
  content = handleTemplate({ content, filePath, pluginOptions })
  content = handleScript({ content, filePath, pluginOptions })
  content = await prettier.format(content, {
    ...prettierConfig,
    parser: 'vue'
  })
  fse.writeFileSync(filePath, content, encoding)
}

/**
 * @param {Object} params
 * @param {string} params.content
 * @param {string} params.filePath
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 * @returns {string}
 */
function handleTemplate({ content, filePath, pluginOptions }) {
  const ast = parse(content, { parseMode: 'sfc' })
  traverse({ node: ast, filePath, pluginOptions })
  const printer = new VueTemplateASTPrinter()
  printer.print({ node: ast })
  printer.outputList.forEach(
    i => (content = content.replace(i.sourceCode, i.code))
  )

  return content
}

/**
 * @param {Object} params
 * @param {string} params.content
 * @param {string} params.filePath
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 * @returns {string}
 */
function handleScript({ content, filePath, pluginOptions }) {
  // 支持处理 SFC 内有多个 script 的情况
  const regexp = /<script[\s\S]*?>([\s\S]*?)<\/script>/g
  let scriptContentList = []
  let match
  while ((match = regexp.exec(content)) !== null) {
    scriptContentList.push(match[1])
  }

  // 没有脚本，跳过即可
  if (scriptContentList.length === 0) return content

  scriptContentList.forEach(i => {
    i18nScan({
      sourceCode: i,
      filePath,
      pluginOptions,
      // 此处回调函数是同步调用
      afterTransform(transformedCode) {
        content = content.replace(i, `\n${transformedCode}\n`)
      }
    })
  })

  return content
}
