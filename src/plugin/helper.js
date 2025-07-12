import { generate } from '@babel/generator'
import fse from 'fs-extra'
import nodePath from 'node:path'
import { containsChinese, errorLog } from '../utils.js'

const TEXT_COLLECTION = 'TEXT_COLLECTION'
/**
 * 用于快速确定某个文案是否已有对应的 key
 */
let textKeyCache = null
/**
 * 当前文件有字符串需要替换成国际化调用，需要引入国际化包
 */
const SHOULD_IMPORT = '__shouldImport'
/**
 * 当前 AST 节点需要跳过国际化处理
 */
const SKIP_I18N = '__skipI18n'
/**
 * 通过注释跳过国际化处理
 */
const I18N_DISABLE = 'i18n-disable'

/**
 * @param {import("@babel/helper-plugin-utils").BabelAPI} api
 * @param {Object} options - 使用插件时传入的插件参数
 * @param {string} options.output - 文案文件导出目录
 * @param {string} options.importStatement - 国际化包的导入语句
 * @param {string} options.i18nCallee - 国际化函数名
 * @returns {void}
 */
function validateOptions(api, options) {
  if (!options.output) {
    throw new Error('插件参数 output 不能为空')
  }

  if (!options.importStatement) {
    throw new Error('插件参数 importStatement 不能为空')
  }

  const isLegalImport =
    api.template.ast(options.importStatement)?.type === 'ImportDeclaration'
  if (!isLegalImport) {
    throw new Error(
      `插件参数 importStatement 的值不是合法的导入语句，请检查：${options.importStatement}`
    )
  }

  if (!options.i18nCallee) {
    throw new Error('插件参数 i18nCallee 不能为空')
  }
}

/**
 * 读取本地文案文件，避免生成重复的 key
 * @param {babel.BabelFile} file
 * @param {Object} options - 使用插件时传入的插件参数
 * @param {string} options.output - 文案文件导出目录
 */
function readFromOutputFile(file, options) {
  // 外部已通过 fse.ensureDirSync(output) 保证了输出目录的存在
  const filePath = nodePath.join(options.output, 'zh-CN.json')
  let hash = {}
  if (fse.existsSync(filePath)) {
    try {
      hash = JSON.parse(fse.readFileSync(filePath))
    } catch (e) {
      errorLog(`Error when JSON.parse file content: ${filePath}`)
      hash = {}
    }
  }
  file.set(TEXT_COLLECTION, hash)
}

/**
 * 确保引入国际化包。且只会在当前文件有字符串需要替换成国际化调用时，才引入国际化包
 * @param {import("@babel/helper-plugin-utils").BabelAPI} api
 * @param {babel.NodePath<babel.types.Program>} programPath
 * @param {Object} options
 * @param {string} options.importStatement - 国际化包的引入语句
 * @returns {void}
 */
function ensureImportI18nModule(api, programPath, options) {
  const ast = api.template.ast(options.importStatement)
  const sourceFromConfig = ast.source.value
  const specifierFromConfig = ast.specifiers[0].local.name
  // 遍历所有导入语句，看是否引入过国际化包
  let imported = false

  programPath.traverse({
    ImportDeclaration(path) {
      const specifiers = path.node.specifiers.map(i => i.local.name)
      if (
        path.node.source.value === sourceFromConfig &&
        specifiers.includes(specifierFromConfig)
      ) {
        imported = true
      }
    }
  })

  // 如果已经引入，就不需要再重复引入
  if (imported === true) return

  // 国际化包的 import 语句的 source 不需要国际化
  ast[SKIP_I18N] = true
  // 如果还没有引入国际化包，则自动引入
  programPath.node.body.unshift(ast)
}

/**
 * import 语句的 source 不需要国际化，因此加一个自定义字段，以便后续快速跳过
 *
 * 1. import ... from 'source'
 * 2. import 'source'
 *
 * 以下两个在 AST 中属于 CallExpression，不属于 ImportDeclaration，因此后续单独处理，此处不处理
 *
 * 3. import('source')
 * 4. require('source')
 *
 * @param {babel.NodePath<babel.types.ImportDeclaration>} path
 * @returns {void}
 */
function skipImportSource(path) {
  path.node.source[SKIP_I18N] = true
}

let key = 0
/**
 * 1. 如果已有相同文案，则返回已有相同文案的 key
 * 2. 如果是新文案，则确保新生成的 key 唯一
 * @param {Object} textCollection - 保存现有文案的对象
 * @param {string} text - 待处理的新文案
 * @returns {string} 字符串格式：国际化包名_自增正整数
 * @example
 * intl_1
 * intl_2
 * ...
 */
const genUniqueKey = (textCollection, text) => {
  if (textKeyCache === null) {
    textKeyCache = Object.entries(textCollection).reduce(
      (object, [i18nKey, value]) => {
        object[value] = i18nKey
        return object
      },
      {}
    )
  }
  // 如果已经有相同文案的 key，则返回该 key
  if (textKeyCache[text]) return textKeyCache[text]

  // 避免生成重复的 key
  key += 1
  while (textCollection[`intl_${key}`]) {
    key += 1
  }
  const i18nKey = `intl_${key}`
  // 记录生成过的 key
  textKeyCache[text] = i18nKey

  return i18nKey
}

/**
 * 获取模板字符串的静态部分
 * @param {babel.NodePath<babel.types.TemplateLiteral>} path
 * @param {number} index
 * @returns {string} 返回 value.raw
 */
function getValueInQuasis(path, index) {
  return path.node.quasis[index].value.raw
}

/**
 * 把收集插值的对象转为字符串，作为最后生成的国际化函数调用的第二个参数。
 * 示例：intl.t(key, createPayloadString(placeholderASTHash), '兜底文案')
 * @param {object} placeholderASTHash
 * @returns {string}
 * @example { placeholder_1: x, placeholder_2: y } => '{placeholder_1:x,placeholder_2:y}'
 */
function createPayloadString(placeholderASTHash) {
  const keys = Object.keys(placeholderASTHash)
  const length = keys.length
  return keys.reduce((result, key, index) => {
    result += key
    result += ':'
    result += placeholderASTHash[key]
    result += index !== length - 1 ? ',' : '}'
    return result
  }, '{')
}

/**
 * 判断当前注释 AST 数组是否含有 i18n-disable 注释
 * @param {babel.types.Comment[]} comments
 * @returns {boolean} 是否含有 i18n-disable 注释
 */
function hasDisableComment(comments) {
  const index = Array.isArray(comments)
    ? comments.findIndex(
        commentLine => commentLine.value.trim() === I18N_DISABLE
      )
    : -1
  return index > -1
}

/**
 * @param {babel.NodePath<babel.types.StringLiteral|babel.types.TemplateLiteral>} path
 * @returns {boolean} 是否跳过后续处理
 */
function handleInlineDisableComment(path) {
  return hasDisableComment(path.node.leadingComments)
}

/**
 * 处理位于变量声明上一行的 i18n-disable 注释
 * @param {babel.NodePath<babel.types.StringLiteral|babel.types.TemplateLiteral>} path
 * @returns {boolean} 是否跳过后续处理
 */
function handlePrevDisableComment(path) {
  const leadingComments = path.node.leadingComments
  if (Array.isArray(leadingComments)) {
    return hasDisableComment(leadingComments)
  }

  return false
}

/**
 * 处理位于 JSX 元素上一行的 i18n-disable 注释
 * @param {babel.NodePath<babel.types.Node>} linePath
 * @param {babel.NodePath<babel.types.Node>} targetPath
 * @returns {boolean} 是否跳过后续处理
 */
function handlePrevDisableCommentForJSX(linePath, targetPath) {
  const innerComments = targetPath.node.expression.innerComments
  if (Array.isArray(innerComments)) {
    const i18nDisable = hasDisableComment(innerComments)
    if (i18nDisable === false) return false

    // 当前 JSX 元素的所有属性值、文本内容均跳过国际化处理
    linePath.node[SKIP_I18N] = true
    return true
  }

  return false
}

/**
 * @param {object} params
 * @param {import("@babel/helper-plugin-utils").BabelAPI} params.api
 * @param {babel.PluginPass} params.state
 * @param {string} params.text - 要国际化的原文案
 * @param {object} [params.payload] - 模板字符串的插值数据对象
 * @returns {babel.types.Statement} 国际化函数调用的 AST 节点
 */
function saveTextAndGenNewNode({ api, state, text, payload }) {
  // file 内部使用了一个 Map 来存 TEXT_COLLECTION 对象，file.get 方法内部调用的是 this._map.get(key)
  // const textCollection = path.hub.file.get(TEXT_COLLECTION)
  const textCollection = state.file.get(TEXT_COLLECTION)
  const key = genUniqueKey(textCollection, text)
  // 保存到 file 对象上，便于后续输出成 JSON 文件
  textCollection[key] = text
  // 当前文件有字符串需要替换成国际化调用，需要引入国际化包
  state[SHOULD_IMPORT] === undefined && (state[SHOULD_IMPORT] = true)
  if (payload) {
    // key、兜底文案都需要加上引号（单双均可）
    return api.template.ast(
      `${state.i18nCallee}('${key}', ${payload}, '${text}')`
    )
  }
  return api.template.ast(`${state.i18nCallee}('${key}', {}, '${text}')`)
}

/**
 * 用于处理普通字符串、模板字符串的通用工具函数集
 */
const literalUtils = {
  /**
   * 有些场景不需要国际化
   * @param {babel.NodePath<babel.types.StringLiteral|babel.types.TemplateLiteral>} path
   * @param {babel.PluginPass} state
   * @returns {boolean} 是否跳过后续处理
   */
  shouldSkip(path, state) {
    // 1. import 语句的 source 不需要国际化
    // 这个条件分支只有 StringLiteral 会走，因为只支持 import ...from 'source'
    // source 部分使用模板字符串即 import ... from`xxx` 会报错
    if (path.node[SKIP_I18N]) return true

    // 2. 处理 require('source')
    const isRequireCall = Boolean(
      path.findParent(
        p => p.isCallExpression() && p.node.callee.name === 'require'
      )
    )
    // 3. 处理 import('source')。import 调用的 AST 跟 require 调用的不一样，p.node.callee 下没有 name 属性，故改用 type 属性
    const isImportCall = Boolean(
      path.findParent(
        p => p.isCallExpression() && p.node.callee.type === 'Import'
      )
    )
    if (isRequireCall || isImportCall) return true

    // 5. 已经国际化的文案，不需要再重复国际化
    // 场景：
    // const a = intl.t('hello', {}, '你好')
    // const b = intl.t(`hello`, {}, `你好`)
    // const world = '世界'
    // const c = intl.t(`hello world`, {}, `你好 ${world}`)
    // <p title={intl.t('title', {}, '标题')}></p>
    // <p>{intl.t('content', {}, '内容')}</p>
    // <p title={intl.t(`title`, {}, `标题`)}></p>
    // <p>{intl.t(`content`, {}, `内容`)}</p>
    const targetPath = path.findParent(p => p.isCallExpression())
    const translated =
      targetPath && generate(targetPath.node.callee).code === state.i18nCallee
    if (translated) return true

    // 6. 不含有中文字符的，直接跳过。
    // 这样做的问题：导致该工具只能是给特定语言（中文）用的。因为暂时没想到好的解决方案，暂时先这样
    // 问题场景：
    // 对于部分 HTML 属性，其值不应该被国际化。比如 className、id、style、src、href 等，扫描时需要跳过。有两个小问题：
    // 1. 这种属性过多，穷举处理所有 HTML 标签的属性会相当耗时。但是感觉穷举在根本上也不太行，因为组件的 prop 可以任意命名，因此穷举在组件上是不可行的
    // 2. 相同属性，在不同标签上，可能需要不同处理，比如 iframe 的 name 属性不需要处理，但是在某个自定义组件标签上 name 作为 prop 可能需要处理
    // 能想到的方式时，只扫描含有特定语言字符的字符串，从而绕过这个问题。但是只扫描特定语言字符串，就会导致写出来的插件只能给特定语言用，无法通用
    // ! 使用这个方式判断后，前面的 1、2、3 实际上可以删除了
    const text = path.isStringLiteral()
      ? path.node.value
      : path.node.quasis.map(e => e.value.raw).join()
    if (!containsChinese(text)) return true

    return false
  },
  /**
   * 遇到 i18n-disable 注释，就跳过国际化处理
   * @param {babel.NodePath<babel.types.StringLiteral|babel.types.TemplateLiteral>} path
   * @returns {boolean} 是否跳过后续处理
   */
  handleDisableComment(path) {
    let targetPath
    // 1. 普通字符串 const a = /*i18n-disable*/'x' 或 <div>{/*i18n-disable*/'x'}</div>
    // 2. 模板字符串
    // const a = /*i18n-disable*/`x`
    // <p data-x={/*i18n-disable*/`x`}></p>
    // <p>{/*i18n-disable*/`x`}</p>
    // ====================================
    // const a = /*i18n-disable*/`a ${x}`
    // <p data-x={/*i18n-disable*/`a ${x}`}></p>
    // <p>{/*i18n-disable*/`a ${x}`}</p>
    //
    // ====================================
    // const obj = {
    //   a: /* i18n-disable */ 'x',
    //   b: /* i18n-disable */ `x`,
    //   c: /* i18n-disable */ `a ${x}`
    // }
    if (Array.isArray(path.node.leadingComments)) {
      return handleInlineDisableComment(path)
    }
    // 3. 普通字符串
    // /*i18n-disable*/
    // const a = 'x'
    // 4. 模板字符串
    // /*i18n-disable*/
    // const a = `x`
    // ====================================
    // /*i18n-disable*/
    // const a = `a ${x}`
    //
    // ====================================
    // const obj = {
    //   // i18n-disable
    //   a: 'x',
    //   // i18n-disable
    //   b: `x`,
    //   // i18n-disable
    //   c: `a ${x}`
    // }
    targetPath = path.findParent(
      p => p.isVariableDeclaration() || p.isObjectProperty()
    )
    if (targetPath !== null) {
      return handlePrevDisableComment(targetPath)
    }

    // 5. 普通字符串
    // {/* i18n-disable */}
    // <p title="x"></p>
    // 6. 模板字符串：JSX 元素属性
    // {/*i18n-disable*/}
    // <p data-x={`xxx`}></p>
    // ====================================
    // {/*i18n-disable*/}
    // <p data-x={`a ${x}`}></p>
    // 7. 模板字符串：JSX 元素内容
    // {/*i18n-disable*/}
    // <p>{`x`}</p>
    // ====================================
    // {/*i18n-disable*/}
    // <p>{`a ${x}`}</p>
    const linePath = path.findParent(p => p.isJSXElement())
    if (linePath?.node?.[SKIP_I18N]) return true
    targetPath = linePath?.getPrevSibling?.()?.getPrevSibling?.()
    if (targetPath?.isJSXExpressionContainer()) {
      return handlePrevDisableCommentForJSX(linePath, targetPath)
    }

    return false
  },
  /**
   * 生成国际化函数调用，并替换原有的普通字符串
   * @param {import("@babel/helper-plugin-utils").BabelAPI} api
   * @param {babel.NodePath<babel.types.StringLiteral>} path
   * @param {babel.PluginPass} state
   * @returns {void}
   */
  replaceStringLiteral(api, path, state) {
    // 两种主要场景：是否是 JSX 属性值。jsx 属性值需要进一步分子场景处理
    // <div title="中文"></div>
    // => <div title=_intl.t('intl1', {}, 'title')></div> 没有用大括号包裹的话会报错，因此替换时，需要补上大括号
    // <div title={"中文"}></div>
    // => <div title={_intl.t('intl1', {}, 'title')}></div> 已经有大括号的，直接替换即可
    // 没有大括号包裹，则节点关系是 StringLiteral -> JSXAttribute
    // 有大括号包裹，则节点关系是 StringLiteral -> JSXExpressionContainer -> JSXAttribute
    // 有大括号包裹时，中间会多一层 JSXExpressionContainer
    const isJSXExpressionContainer = Boolean(
      path.findParent(p => p.isJSXExpressionContainer())
    )
    const isJSXAttribute = Boolean(path.findParent(p => p.isJSXAttribute()))

    // 1. 有大括号包裹的 JSX 属性值
    // 2. 普通字符串
    let newNode = saveTextAndGenNewNode({ api, state, text: path.node.value })
    if (!isJSXExpressionContainer && isJSXAttribute) {
      // 3. 没有大括号包裹的 JSX 属性值，需要补上大括号
      // api.types.JSXExpressionContainer 函数只接受 Expression | JSXEmptyExpression
      newNode = api.types.JSXExpressionContainer(newNode.expression)
    }
    path.replaceWith(newNode)
    // 避免处理 newNode 的字符串子节点
    path.skip()
  },
  /**
   * 生成国际化函数调用，并替换原有的模板字符串
   * @param {import("@babel/helper-plugin-utils").BabelAPI} api
   * @param {babel.NodePath<babel.types.TemplateLiteral>} path
   * @param {babel.PluginPass} state
   * @returns {void}
   */
  replaceTemplateLiteral(api, path, state) {
    // ! 1. 无插值，基本上等同于普通字符串，可细分为两种场景，但是这两种子场景均可以直接替换，所以处理流程一致
    // 1-1. 普通模板字符串 const a = `x`
    // 1-2. JSX 属性值 <p data-x={`x`}></p> 或 JSX 元素内容 <p>{`x`}</p>
    // ! 2. 有插值，需要拼接 quasis 和 expressions 两个数组中的元素，同上，也可细分为两种场景：
    // 2-1. 普通模板字符串 const a = `a ${x}`
    // 2-2. JSX 属性值 <p data-x={`a ${x}`}></p> 或 JSX 元素内容 <p>{`a ${x}`}</p>
    const { quasis, expressions } = path.node
    let text
    let newNode

    if (expressions.length === 0) {
      // 无插值时，quasis 数组只会有一个元素，直接取即可
      text = getValueInQuasis(path, 0)
      newNode = saveTextAndGenNewNode({ api, state, text })
      path.replaceWith(newNode)
      path.skip()
    } else {
      // 有插值时，手动拼接
      // quasis 数组长度一定是： expressions 数组长度 + 1
      // - `${x}`   => { quasis: ['', ''],   expressions: [x] }
      // - `a${x}`  => { quasis: ['a', ''],  expressions: [x] }
      // - `${x}a`  => { quasis: ['', 'a'],  expressions: [x] }
      // - `a${x}b` => { quasis: ['a', 'b'], expressions: [x] }
      // 拼接过程中，收集插值，结果形如：{ placeholder_1: x }
      const placeholderASTHash = {}
      // 拼接顺序是：
      // 第一个 quasis 数组元素
      // + 第一个 expressions 数组元素 + 第二个 quasis 数组元素
      // + 第二个 expressions 数组元素 + 第三个 quasis 数组元素
      // + ...
      // + 第n个 expressions 数组元素 + 第n+1个 quasis 数组元素
      // text 结果形如：'... {placeholder_1} ... {placeholder_2} ...'
      text = expressions.reduce((result, ast, index) => {
        const _index = index + 1
        const placeholder = `placeholder_${_index}`
        result += `{${placeholder}}`
        result += getValueInQuasis(path, _index)

        // 收集插值
        // 此处的 ast 可能是一个变量、计算表达式、函数调用，因此用 generate 方法快速取得对应的源码
        // 源码             => parse 后的 AST                              => 提取出变量/计算表达式/函数调用
        // 1. `a ${x}`     => { quasis: ['a', ''], expressions: [x] }     => x
        // 2. `a ${x + y}` => { quasis: ['a', ''], expressions: [x + y] } => x + y
        // 3. `a ${x()}`   => { quasis: ['a', ''], expressions: [x()] }   => x()
        placeholderASTHash[placeholder] = generate(ast).code
        return result
      }, getValueInQuasis(path, 0))

      // payload 不能简单用 JSON.stringify(placeholderASTHash) 求得
      // 举例，实际要拼装得到的：
      // _intl.t('intl_1', { placeholder_1: x }, 'hello {placeholder_1}');
      // 如果用 JSON.stringify，则会把变量变成字符串，最终导致替换后，取值会出错：
      // _intl.t('intl_1', { "placeholder_1": "x" }, 'hello {placeholder_1}');
      const payload = createPayloadString(placeholderASTHash)
      newNode = saveTextAndGenNewNode({ api, state, text, payload })
      path.replaceWith(newNode)
      path.skip()
    }
  }
}

/**
 * 用于处理 JSX 元素内容的通用工具函数集
 */
const jsxTextUtils = {
  /**
   * 有些场景不需要国际化
   * @param {babel.NodePath<babel.types.JSXText>} path
   * @returns {boolean} 是否跳过后续处理
   */
  shouldSkip(path) {
    // 换行也是 JSX 节点，需要过滤
    const text = path.node.value
    if (!containsChinese(text)) return true
    return Boolean(text.trim()) === false
  },
  /**
   * 遇到 i18n-disable 注释，就跳过国际化处理，并删除该注释
   * @param {babel.NodePath<babel.types.JSXText>} path
   * @returns {boolean} 是否跳过后续处理
   */
  handleDisableComment(path) {
    // 场景：
    // {/*i18n-disable*/}
    // <p>x</p>
    const linePath = path.findParent(p => p.isJSXElement())
    const targetPath = linePath?.getPrevSibling?.()?.getPrevSibling?.()
    if (targetPath?.isJSXExpressionContainer()) {
      return handlePrevDisableCommentForJSX(linePath, targetPath)
    }
    return false
  },
  /**
   * 生成国际化函数调用，并替换原有的 JSX 元素内容
   * @param {import("@babel/helper-plugin-utils").BabelAPI} api
   * @param {babel.NodePath<babel.types.JSXText>} path
   * @param {babel.PluginPass} state
   * @returns {void}
   */
  replace(api, path, state) {
    // 场景：
    // <div>x</div> => <div>{i18n.t('intl_1', {}, 'x')}</div>
    // ! trim 是为了解决 JSX 文本内容存在换行时，导致解析出来的 text 含有换行符，如 '\n  x'
    // <div>
    //   x
    // </div >
    // 最终会导致生成的国际化函数调用也会出现换行的情况，如：
    // intl.t('intl_1', {}, '
    //          count 是 ')
    // 从而导致 babel 抛错
    // ? 暂时先用 trim 解决
    const text = path.node.value.trim()
    let newNode = saveTextAndGenNewNode({ api, state, text })
    // 替换时需要补上大括号，否则就不会被解析为 JS 的函数调用
    newNode = api.types.JSXExpressionContainer(newNode.expression)
    path.replaceWith(newNode)
    path.skip()
  }
}

/**
 * @param {babel.BabelFile} file
 * @param {Object} options
 * @param {string} options.output - 文案文件导出目录
 * @returns {void}
 */
function writeTextCollectionToFile(file, options) {
  const textCollection = file.get(TEXT_COLLECTION)
  if (Object.keys(textCollection).length === 0) return

  const filePath = nodePath.join(options.output, 'zh-CN.json')
  fse.ensureFileSync(filePath)
  // 序列化可能比较耗时，改为通过遍历手动拼接字符串
  // const content = `${JSON.stringify(textCollection, null, 2)}`;
  const content = Object.entries(textCollection)
    .map(([key, value]) => `  "${key}": "${value}"`)
    .join(',\n')
  fse.writeFileSync(filePath, `{\n${content}\n}`, 'utf8')
}

export {
  SHOULD_IMPORT,

  validateOptions,
  readFromOutputFile,
  ensureImportI18nModule,

  skipImportSource,

  literalUtils,
  jsxTextUtils,

  writeTextCollectionToFile
}
