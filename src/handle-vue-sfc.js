// const fse = require('fs-extra')
// const html2AST = require('html-to-ast')
// const i18nScan = require('./i18n-scan')
// const { containsChinese } = require('./utils')

// module.exports = function handleVueSFC(filePath) {
//   const encoding = { encoding: 'utf-8' }
//   let content = fse.readFileSync(filePath, encoding)
//   content = handleTemplate(content, filePath)
//   content = handleScript(content, filePath)
//   fse.writeFileSync(filePath, content, encoding)
// }

// function handleTemplate(content, filePath) {
//   // 匹配出 .vue 中的模板内容，不包含 template 开始、结束标签
//   const template = content.match(/<template>([\s\S]*)<\/template>/g)?.[0]
//   // 没有模板，跳过即可，因为可能是使用 JSX 写法
//   if (!template) return content

//   // 把模板内容当成 HTML，解析成 AST
//   const htmlAST = html2AST.parse(template)?.[0]
//   if (!htmlAST) return content

//   // 遍历 AST 做自动国际化处理
//   traverse(htmlAST, filePath)

//   // 把处理过的 AST 再转回 HTML 字符串
//   const transformedTemplate = html2AST.stringify([htmlAST])
//   return content.replace(template, transformedTemplate)
// }

// /**
//  * 遍历 HTML AST 节点做自动国际化处理
//  */
// function traverse(node, filePath) {
//   const HELPER_STRING = 'const __special_to_avoid_conflict__ = '

//   // 1. 处理文本节点
//   if (node.type === 'text') {
//     // 如果是标签之间的换行符，直接跳过，只需处理标签内容
//     if (node.content.trim() === '') return
//     // 不需要国际化的节点，直接跳过
//     if (!containsChinese(node.content)) return

//     // 场景：<p>前缀 {{ msg }} 后缀</p>
//     // node.content 为 '前缀 {{ msg }} 后缀'
//     // 处理方法：解析成静态文本、动态脚本（变量、计算表达式、函数调用等），挨个处理
//     // '前缀 {{ msg }} 后缀' => ['前缀', ' msg ', '后缀']
//     const list = parseVueElementContentToList(node.content)
//     let result = ''
//     // 挨个传给 babel 处理
//     list.forEach(i => {
//       i18nScan({
//         // sourceCode: i.text,
//         // 如果是普通字符串，直接做为 sourceCode 的值传入解析，会被解析为 directive（如 `'use strict';`）
//         // 因此构造为一个赋值语句绕过该情况
//         sourceCode: i.expression ? i.expression : `${HELPER_STRING}"${i.text}"`,
//         filePath,
//         pluginOptions: {
//           importStatement: "import intl from 'intl'",
//           i18nCallee: 'intl.t',
//           output: 'i18n'
//         },
//         // 此处回调函数是同步调用
//         afterTransform(transformedCode) {
//           // TODO: 改为从插件参数里取
//           transformedCode = transformedCode
//             .replace("import intl from 'intl'", '')
//             .replace(/;/g, '')
//             .replace(HELPER_STRING, '')
//             .trim()
//           result += `{{${transformedCode}}}`
//         }
//       })
//     })
//     // 用新字符串覆盖旧字符串
//     node.content = result
//   }

//   // 2. 处理标签节点
//   // 2-1. 遍历 attrs
//   const attrKeys = Object.keys(node.attrs || {})
//   attrKeys.length !== 0 &&
//     attrKeys.forEach(key => {
//       const value = node.attrs[key]
//       // 不需要国际化的节点，直接跳过
//       if (!containsChinese(value)) return
//       // 转给 babel 处理
//       i18nScan({
//         // 1. 如果属性是以 : 开头，说明这是一个 v-bind，其值就是一个表达式，直接解析即可
//         // 2. 如果是普通字符串，直接做为 sourceCode 的值传入解析（`sourceCode: value,`），会被解析为 directive（如 `'use strict';`）
//         // 因此构造为一个赋值语句绕过该情况
//         sourceCode: key.startsWith(':') ? value : `${HELPER_STRING}"${value}"`,
//         filePath,
//         pluginOptions: {
//           importStatement: "import intl from 'intl'",
//           i18nCallee: 'intl.t',
//           output: 'i18n'
//         },
//         // 此处回调函数是同步调用
//         afterTransform(transformedCode) {
//           // TODO: 改为从插件参数里取
//           transformedCode = transformedCode
//             .replace("import intl from 'intl'", '')
//             .replace(/;/g, '')
//             .replace(HELPER_STRING, '')
//             .trim()
//           let _key = key
//           // 场景：content="中文" => :content="intl.t('key_1', {}, '中文')"
//           if (!key.startsWith(':')) {
//             // 需要删除 content="中文"
//             delete node.attrs[key]
//             _key = `:${key}`
//           }
//           // 用新字符串覆盖旧字符串
//           node.attrs[_key] = transformedCode
//         }
//       })
//     })

//   // 2-2. 递归处理 children
//   node.children?.forEach(childNode => traverse(childNode, filePath))
// }

// /**
//  * 解析 'xxx{{yyy}}' 形式的字符串
//  * 1. 'xxx'
//  * 2. 'xxx{{}}'
//  * 3. 'xxx{{yyy}}'
//  * 4. '{{yyy}}'
//  * 5. '{{}}'
//  *
//  * 支持在插值中：
//  * 1. 使用 IIFE {{ (() => {...})() }}
//  * 2. 使用模板字符串 {{ `${...}` }}
//  */
// function parseVueElementContentToList(content) {
//   let subString
//   let left = 0
//   let right = 0
//   const length = content.length
//   const list = []

//   while (right < length) {
//     while (
//       right < length &&
//       !(content[right] === '{' && content[right + 1] === '{')
//     ) {
//       right += 1
//     }
//     // 遇到了 {{，因此把前面的非空字符记录下来
//     if (left !== right) {
//       subString = content.slice(left, right).trim()
//       subString && list.push({ text: subString })
//     }
//     // 跳过 {{
//     right += 2
//     if (right >= length) break
//     left = right
//     // 已经遇到过 {{，此处开始就是解析表达式
//     while (
//       right < length &&
//       !(content[right] === '}' && content[right + 1] === '}')
//     ) {
//       right += 1
//     }
//     // 遇到了 }}，因此把前面的表达式记录下来
//     if (left !== right) {
//       subString = content.slice(left, right).trim()
//       subString && list.push({ expression: subString })
//     }
//     // 跳过 }}
//     right += 2
//     left = right
//     // 重复前面的操作
//   }

//   return list
// }

// function handleScript(content, filePath) {
//   // 支持处理 SFC 内有多个 script 的情况
//   const regexp = /<script[\s\S]*?>([\s\S]*?)<\/script>/g
//   let scriptContentList = []
//   let match
//   while ((match = regexp.exec(content)) !== null) {
//     scriptContentList.push(match[1])
//   }

//   // 没有脚本，跳过即可
//   if (scriptContentList.length === 0) return content

//   scriptContentList.forEach(i => {
//     i18nScan({
//       sourceCode: i,
//       filePath,
//       pluginOptions: {
//         importStatement: "import intl from 'intl'",
//         i18nCallee: 'intl.t',
//         output: 'i18n'
//       },
//       // 此处回调函数是同步调用
//       afterTransform(transformedCode) {
//         content = content.replace(i, `\n${transformedCode}\n`)
//       }
//     })
//   })

//   return content
// }
