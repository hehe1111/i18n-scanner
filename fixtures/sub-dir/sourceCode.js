// https://astexplorer.net/#/gist/ab062f424661baf91a93193a50bb59c1/b546b95ce3edef1be0c0e7f680e5337e8364526e

// 普，需 => 普通字符串，需要翻译
// 普，同 => 普通字符串，同行注释，不翻译
// 普，前 => 普通字符串，前置注释，不翻译
// 普，前，块 => 普通字符串，前置注释，不翻译，CommentBlock

// 无，需 => 无插值模板字符串，需要翻译
// 无，同 => 无插值模板字符串，同行注释，不翻译
// 无，前 => 无插值模板字符串，前置注释，不翻译
// 无，前，块 => 无插值模板字符串，前置注释，不翻译，CommentBlock

// 有，需 => 有插值模板字符串，需要翻译
// 有，同 => 有插值模板字符串，同行注释，不翻译
// 有，前 => 有插值模板字符串，前置注释，不翻译
// 有，前，块 => 有插值模板字符串，前置注释，不翻译，CommentBlock

// J，属，普，不 => JSX 属性值，普通字符串，不需要翻译
// J，属，普，需 => JSX 属性值，普通字符串，需要翻译

// J，内，普，需 => JSX 元素内容，普通字符串，需要翻译

// J，属，普，同 => JSX 属性值，普通字符串，同行注释，不需要翻译
// J，内，普，同 => JSX 元素内容，普通字符串，同行注释，不需要翻译

// J，属，普，前 => JSX 属性值，普通字符串，前置注释，不需要翻译
// J，内，普，前 => JSX 元素内容，普通字符串，前置注释，不需要翻译

// ==================================================================

// J，属，无，不 => JSX 属性值，无插值模板字符串，不需要翻译
// J，属，无，需 => JSX 属性值，无插值模板字符串，需要翻译

// J，内，无，需 => JSX 元素内容，无插值模板字符串，需要翻译

// J，属，无，同 => JSX 属性值，无插值模板字符串，同行注释，不需要翻译
// J，内，无，同 => JSX 元素内容，无插值模板字符串，同行注释，不需要翻译

// J，属，无，前 => JSX 属性值，无插值模板字符串，前置注释，不需要翻译
// J，内，无，前 => JSX 元素内容，无插值模板字符串，前置注释，不需要翻译

// ==================================================================

// J，属，有，不 => JSX 属性值，有插值模板字符串，不需要翻译
// J，属，有，需 => JSX 属性值，有插值模板字符串，需要翻译

// J，内，有，需 => JSX 元素内容，有插值模板字符串，需要翻译

// J，属，有，同 => JSX 属性值，有插值模板字符串，同行注释，不需要翻译
// J，内，有，同 => JSX 元素内容，有插值模板字符串，同行注释，不需要翻译

// J，属，有，前 => JSX 属性值，有插值模板字符串，前置注释，不需要翻译
// J，内，有，前 => JSX 元素内容，有插值模板字符串，前置注释，不需要翻译

import intl from 'intl'
import a from 'a'
import { b } from 'b'
import * as c from 'c'
import 'd'

const e = require('e')
import('f')

const e1 = require(`e1`)
import(`f1`)

const obj1 = {
  a: '普，需',
  b: /* i18n-disable */ '普，同',
  // i18n-disable
  c: '普，前',
  /* i18n-disable */
  d: '普，前，块',
}

const obj2 = {
  a: `无，需`,
  b: /* i18n-disable */ `无，同`,
  // i18n-disable
  c: `无，前`,
  /* i18n-disable */
  d: `无，前，块`
}

const obj3 = {
  a: `有，需 ${hi}`,
  b: /* i18n-disable */ `有，同 ${hi}`,
  // i18n-disable
  c: `有，前 ${hi}`,
  /* i18n-disable */
  d: `有，前，块 ${hi}`
}

const hi = '= 插值 ='
const classNameAAA = 'aaa'

function foo() {
  const need = '普，需'
  const skipInline = /* i18n-disable */ '普，同'
  // i18n-disable
  const skipPrev = '普，前'
  /* i18n-disable */
  const skipPrev2 = '普，前，块'

  const need2 = `无，需`
  const skipInline2 = /* i18n-disable */ `无，同`
  // i18n-disable
  const skipPrev3 = `无，前`
  /* i18n-disable */
  const skipPrev4 = `无，前，块`

  const need3 = `有，需 ${hi}`
  const skipInline3 = /* i18n-disable */ `有，同 ${hi}`
  // i18n-disable
  const skipPrev5 = `有，前 ${hi}`
  /* i18n-disable */
  const skipPrev6 = `有，前，块 ${hi}`

  const variable = 1
  const expression = 2 + 3
  const fnCall = () => 4
  const multiple = `有，需，变量=${variable}，计算表达式=${expression}，函数调用=${fnCall()}`
}

const world = '世界'
const translated = () => {
  const a = intl.t('hello', {}, '你好')
  const b = intl.t(`hello`, {}, `你好`)
  const c = intl.t(`hello world`, { world }, `你好 {world}`)

  return (
    <>
      <p title={intl.t('title', {}, '标题')}></p>

      <p>{intl.t('content', {}, '内容')}</p>

      <p title={intl.t(`title`, {}, `标题`)}></p>

      <p>{intl.t(`content`, {}, `内容`)}</p>
    </>
  )
}

function App() {
  return (
    <>
      <p className="do-not-translate" title="J，属，普，需"></p>
      <p>J，内，普，需</p>

      <p title={/* i18n-disable */ 'J，属，普，同'}></p>
      <p>{/* i18n-disable */ 'J，内，普，同'}</p>

      {/* i18n-disable */}
      <p title="J，属，普，前" title2="J，属，普，前"></p>
      {/* i18n-disable */}
      <p>J，内，普，前</p>

      {/* ============================================================ */}

      <p className={`do-not-translate`} title={`J，属，无，需`}></p>
      <p>{`J，内，无，需`}</p>

      <p title={/* i18n-disable */ `J，属，无，同`}></p>
      <p>{/* i18n-disable */ `J，内，无，同`}</p>

      {/* i18n-disable */}
      <p title={`J，属，无，前`}></p>
      {/* i18n-disable */}
      <p>{`J，内，无，前`}</p>

      {/* ============================================================ */}

      <p
        className={`do-not-translate ${classNameAAA}`}
        title={`J，属，有，需 ${hi}`}
      ></p>
      <p>{`J，内，有，需 ${hi}`}</p>

      <p title={/* i18n-disable */ `J，属，有，同 ${hi}`}></p>
      <p>{/* i18n-disable */ `J，内，有，同 ${hi}`}</p>

      {/* i18n-disable */}
      <p title={`J，属，有，前 ${hi}`} title2={`J，属，有，前 ${hi}`}></p>
      {/* i18n-disable */}
      <p>{`J，内，有，前 ${hi}`}</p>
    </>
  )
}
