const TYPE = {
  ROOT: 0,
  TAG: 1,
  TEXT: 2,
  COMMENT: 3,
  V_BIND: 4,
  MUSTACHE: 5,
  STATIC_ATTRIBUTE: 6,
  BINDING: 7 // v-bind / v-on
}
const TEMPLATE = 'template'
const POST_I18N = '__POST_I18N__'
const HELPER_STRING = 'const __special_to_avoid_conflict__ = '

module.exports = {
  TYPE,
  TEMPLATE,
  POST_I18N,
  HELPER_STRING
}
