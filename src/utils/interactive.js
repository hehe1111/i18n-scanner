import readline from 'readline'

/**
 * 创建命令行交互界面
 * @returns {readline.Interface}
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
}

/**
 * 询问用户问题并获取答案
 * @param {string} question 要询问的问题
 * @returns {Promise<string>} 用户的回答
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = createReadlineInterface()
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * 询问用户是否选择（y/n）
 * @param {string} question 要询问的问题
 * @param {boolean} defaultValue 默认值
 * @returns {Promise<boolean>} 用户的选择
 */
async function askYesNo(question, defaultValue = false) {
  const defaultText = defaultValue ? 'Y/n' : 'y/N'
  const answer = await askQuestion(`${question} (${defaultText}): `)
  
  if (answer === '') {
    return defaultValue
  }
  
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

/**
 * 询问用户选择选项
 * @param {string} question 要询问的问题
 * @param {Array<{value: string, label: string}>} options 选项列表
 * @param {string} defaultValue 默认值
 * @returns {Promise<string>} 用户选择的值
 */
async function askChoice(question, options, defaultValue) {
  console.log(question)
  options.forEach((option, index) => {
    const prefix = option.value === defaultValue ? '*' : ' '
    console.log(`${prefix} ${index + 1}. ${option.label}`)
  })
  
  const answer = await askQuestion(`请选择 (1-${options.length}, 默认: ${defaultValue}): `)
  
  if (answer === '') {
    return defaultValue
  }
  
  const choiceIndex = parseInt(answer) - 1
  if (choiceIndex >= 0 && choiceIndex < options.length) {
    return options[choiceIndex].value
  }
  
  return defaultValue
}

/**
 * 询问用户关于 script 标签的配置
 * @param {number} [detectedVersion] 检测到的Vue版本
 * @param {boolean} [detectedTypeScript] 检测到的TypeScript配置
 * @param {boolean} [detectedSetup] 检测到的setup配置
 * @returns {Promise<{version: number, useSetup: boolean, useTypeScript: boolean}>}
 */
async function askScriptTagConfig(detectedVersion, detectedTypeScript, detectedSetup) {
  console.log('\n请配置要创建的 <script> 标签：')
  
  let version = detectedVersion
  let useTypeScript = detectedTypeScript
  let useSetup = detectedSetup
  
  // 询问 Vue 版本（如果未检测到）
  if (version === undefined) {
    version = await askChoice(
      '请选择 Vue 版本：',
      [
        { value: 3, label: 'Vue 3 (支持 Composition API)' },
        { value: 2, label: 'Vue 2 (传统 Options API)' }
      ],
      3
    )
  }
  
  // 询问 TypeScript（如果未检测到）
  if (useTypeScript === undefined) {
    useTypeScript = await askYesNo('是否使用 TypeScript？', false)
  }
  
  // 询问 setup 语法（如果未检测到且是 Vue 3）
  if (useSetup === undefined && version === 3) {
    useSetup = await askYesNo('是否使用 <script setup> 语法？(Vue 3 Composition API)', true)
  } else if (version === 2) {
    useSetup = false // Vue 2 不支持 setup
  }
  
  return {
    version: version || 3,
    useSetup: useSetup !== false,
    useTypeScript: useTypeScript === true
  }
}

export {
  askQuestion,
  askYesNo,
  askChoice,
  askScriptTagConfig
}