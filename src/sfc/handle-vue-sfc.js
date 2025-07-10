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
  
  // 先处理模板部分
  content = handleTemplate({ content, filePath, pluginOptions })
  
  // 检查处理后的内容中是否使用了国际化函数调用
  const templateHasI18nCall = content.includes(pluginOptions.i18nCallee)
  
  content = handleScript({ content, filePath, pluginOptions, templateHasI18nCall })
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
 * @param {boolean} params.templateHasI18nCall 模板中是否使用了国际化函数调用
 * @returns {string}
 */
function handleScript({ content, filePath, pluginOptions, templateHasI18nCall = false }) {
  // 支持处理 SFC 内有多个 script 的情况
  const regexp = /<script([\s\S]*?)>([\s\S]*?)<\/script>/g
  let scriptContentList = []
  let scriptMatches = []
  let match
  while ((match = regexp.exec(content)) !== null) {
    scriptContentList.push(match[2])
    scriptMatches.push({
      fullMatch: match[0],
      attributes: match[1],
      innerContent: match[2]
    })
  }

  // 没有脚本，跳过即可
  if (scriptContentList.length === 0) return content

  scriptContentList.forEach((scriptContent, index) => {
    i18nScan({
      sourceCode: scriptContent,
      filePath,
      pluginOptions,
      // 如果模板中使用了国际化函数，需要确保 script 中导入了相应的包
      forceImport: templateHasI18nCall,
      // 此处回调函数是同步调用
      afterTransform(transformedCode) {
        // 构造新的 script 标签内容
        const originalScriptMatch = scriptMatches[index]
        const newScriptContent = `<script${originalScriptMatch.attributes}>\n${transformedCode}\n</script>`
        content = content.replace(originalScriptMatch.fullMatch, newScriptContent)
      }
    })
  })

  return content
}
