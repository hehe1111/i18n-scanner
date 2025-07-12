import fse from 'fs-extra'
import { parse } from '@vue/compiler-dom'
import prettier from 'prettier'
import { traverse } from './template-ast-traverse.js'
import { VueTemplateASTPrinter } from './template-ast-printer.js'
import i18nScan from '../i18n-scan.js'
import prettierConfig from '../prettier-config.js'
import { resolveVueScriptConfig } from '../utils/vue-config.js'

/**
 * @param {Object} params
 * @param {string} params.filePath
 * @param {Object} params.pluginOptions
 * @param {string} params.pluginOptions.importStatement
 * @param {string} params.pluginOptions.i18nCallee
 * @param {string} params.pluginOptions.output
 */
export default async function handleVueSFC({ filePath, pluginOptions }) {
  const encoding = { encoding: 'utf-8' }
  let content = fse.readFileSync(filePath, encoding)
  
  // 先处理模板部分
  content = handleTemplate({ content, filePath, pluginOptions })
  
  // 检查处理后的内容中是否使用了国际化函数调用
  const templateHasI18nCall = content.includes(pluginOptions.i18nCallee)
  
  content = await handleScript({ content, filePath, pluginOptions, templateHasI18nCall })
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
 * @returns {Promise<string>}
 */
async function handleScript({ content, filePath, pluginOptions, templateHasI18nCall = false }) {
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

  // 如果没有脚本但模板中使用了国际化函数，需要创建一个包含import的script标签
  if (scriptContentList.length === 0 && templateHasI18nCall) {
    // 解析Vue script标签配置（CLI参数 > 自动检测 > 用户交互）
    const { useSetup, useTypeScript } = await resolveVueScriptConfig(pluginOptions.vueConfig)
    
    // 在template标签后面插入一个新的script标签
    const templateEndMatch = content.match(/<\/template>\s*/)
    if (templateEndMatch) {
      const insertPosition = templateEndMatch.index + templateEndMatch[0].length
      const importStatement = pluginOptions.importStatement
      
      // 构建 script 标签属性
      let scriptAttributes = ''
      if (useTypeScript) {
        scriptAttributes += ' lang="ts"'
      }
      if (useSetup) {
        scriptAttributes += ' setup'
      }
      
      const newScriptTag = `\n<script${scriptAttributes}>\n${importStatement}\n</script>\n`
      content = content.slice(0, insertPosition) + newScriptTag + content.slice(insertPosition)
    }
    return content
  }

  // 没有脚本且模板中也没有使用国际化函数，跳过即可
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
