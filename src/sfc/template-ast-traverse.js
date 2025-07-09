const i18nScan = require('../i18n-scan')
const { containsChinese } = require('../utils')
const { TYPE, TEMPLATE, HELPER_STRING, POST_I18N } = require('./constants')

/**
 * @param {Object} params
 * @param {Object} params.node 待处理的 AST 节点
 * @param {string} params.filePath 待处理的文件的路径
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 */
function traverse({ node, filePath, pluginOptions }) {
  if (!node) return

  let text
  switch (node.type) {
    case TYPE.ROOT:
      node.children
        .filter(node => node.type === TYPE.TAG && node.tag === TEMPLATE)
        .forEach(subNode =>
          traverse({ node: subNode, filePath, pluginOptions })
        )
      break
    case TYPE.TAG:
      node.props.length > 0 &&
        node.props.forEach(prop =>
          traverseAttribute({ prop, filePath, pluginOptions })
        )
      node.children.length > 0 &&
        node.children.forEach(subNode =>
          traverse({ node: subNode, filePath, pluginOptions })
        )
      break
    case TYPE.MUSTACHE:
      text = node.content.content
      if (!containsChinese(text)) return
      i18nHelper({
        sourceCode: text.trim(),
        filePath,
        pluginOptions,
        handleTransformedCode(transformedCode) {
          node.content.content = transformedCode
        }
      })
      break
    case TYPE.TEXT:
      text = node.content
      if (!containsChinese(text)) return
      i18nHelper({
        // sourceCode: prop.value.content,
        // 如果是普通字符串，直接做为 sourceCode 的值传入解析，会被解析为 directive（如 `'use strict';`）
        // 因此构造为一个赋值语句绕过该情况
        sourceCode: `${HELPER_STRING}"${text.trim()}"`,
        filePath,
        pluginOptions,
        handleTransformedCode(transformedCode) {
          node.content = `{{${transformedCode}}}`
        }
      })
      break
    case TYPE.COMMENT:
      // do nothing
      break
    default:
    // do nothing
  }
}

/**
 * @param {Object} params
 * @param {Object} params.prop 待处理的参数 AST 节点
 * @param {string} params.filePath 待处理的文件的路径
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 */
function traverseAttribute({ prop, filePath, pluginOptions }) {
  let text
  switch (prop.type) {
    case TYPE.STATIC_ATTRIBUTE:
      text = prop.value.content
      if (!containsChinese(text)) return
      i18nHelper({
        sourceCode: `${HELPER_STRING}"${text.trim()}"`,
        filePath,
        pluginOptions,
        handleTransformedCode(transformedCode) {
          prop[POST_I18N] = `:${prop.name}="${transformedCode}"`
        }
      })
      break
    case TYPE.BINDING:
      // node.exp 可能是 undefined。举例：@click.stop
      text = prop.exp?.content
      if (!containsChinese(text)) return
      i18nHelper({
        sourceCode: text.trim(),
        filePath,
        pluginOptions,
        handleTransformedCode(transformedCode) {
          prop.exp.content = transformedCode
        }
      })
      break
    default:
    // do nothing
  }
}

/**
 * @param {Object} params
 * @param {string} [params.sourceCode] 待处理的源代码。优先级高于 filePath
 * @param {string} params.filePath 待处理的文件的路径。优先级低于 sourceCode 参数
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 * @param {Function} [params.handleTransformedCode] 代码处理完成后，提供一个钩子给外部，方便外部进行二次处理
 */
function i18nHelper({
  sourceCode,
  filePath,
  pluginOptions,
  handleTransformedCode
}) {
  i18nScan({
    sourceCode,
    filePath,
    pluginOptions,
    // 此处回调函数是同步调用
    afterTransform(transformedCode) {
      transformedCode = transformedCode
        .replace(pluginOptions.importStatement, '')
        .replace(/;/g, '')
        .replace(HELPER_STRING, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')
        .trim()
      typeof handleTransformedCode === 'function' &&
        handleTransformedCode(transformedCode)
    }
  })
}

module.exports = {
  traverse
}
