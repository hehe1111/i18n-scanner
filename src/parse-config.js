// https://github.com/cosmiconfig/cosmiconfig
const { cosmiconfigSync } = require('cosmiconfig');

const MODULE_NAME = 'i18n'
const explorerSync = cosmiconfigSync(MODULE_NAME);
const searchedFor = explorerSync.search() || {};

module.exports = searchedFor.config || {}
