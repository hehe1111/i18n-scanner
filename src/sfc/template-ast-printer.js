const { TYPE, TEMPLATE, POST_I18N } = require('./constants')

class VueTemplateASTPrinter {
  constructor() {
    this.tags = []
    this.level = 0
    this.code = ''
    this.sourceCode = ''
    this.outputList = []
  }

  openTag(node) {
    this.indent()
    const { isSelfClosing, tag } = node
    if (isSelfClosing !== true) {
      this.level += 1
      this.tags.push(tag)
    }
    this.code += `<${tag}`
    this.printAttribute(node)
    this.code += isSelfClosing === true ? ' />' : '>'
    ;(node.children.length > 0 || isSelfClosing === true) && this.newLine()
  }

  closeTag({ node, isRootTemplate = false }) {
    if (node.isSelfClosing === true) return
    this.level -= 1
    node.children.length > 0 && this.indent()
    const tagName = this.tags.pop()
    this.code += `</${tagName}>`
    this.newLine()
  }

  printAttribute(node) {
    if (node.props.length === 0) return
    node.props.forEach(subNode => {
      switch (subNode.type) {
        case TYPE.STATIC_ATTRIBUTE:
          this.printStaticAttribute(subNode)
          break
        case TYPE.BINDING:
          this.printBindingAttribute(subNode)
          break
        default:
          break
      }
    })
  }

  printStaticAttribute(node) {
    this.whiteSpace()
    this.code += node[POST_I18N] || `${node.name}="${node.value.content}"`
  }

  /**
   * Handle v-bind / v-on
   */
  printBindingAttribute(node) {
    this.whiteSpace()
    // node.exp 可能是 undefined。举例：@click.stop
    this.code += node.exp?.content ? `${node.rawName}="${node.exp.content}"` : `${node.rawName}`
  }

  printChildren(node) {
    if (node.children.length === 0) return
    // node.children.forEach(this.print) // 这种写法会导致 this 指向错误
    node.children.forEach(subNode => this.print({ node: subNode }))
  }

  // indent 跟 newLine 有点多余，但是暂时先这么处理，避免过于复杂的逻辑，格式问题可以通过 prettier 等解决
  printMustache(node) {
    this.indent()
    this.code += `{{${node.content.content}}}`
    this.newLine()
  }

  // indent 跟 newLine 有点多余，但是暂时先这么处理，避免过于复杂的逻辑，格式问题可以通过 prettier 等解决
  printText(node) {
    this.indent()
    this.code += node.content.trim()
    this.newLine()
  }

  printComment(node) {
    this.indent()
    this.code += `<!-- ${node.content.trim()} -->`
    this.newLine()
  }

  whiteSpace(num = 1) {
    for (let i = 0; i < num; i++) {
      this.code += ' '
    }
  }

  indent() {
    this.whiteSpace(this.level * 2)
  }

  newLine() {
    this.code += '\n'
  }

  print({ node, isRootTemplate = false }) {
    if (!node) return
    switch (node.type) {
      case TYPE.ROOT:
        node.children
          .filter(node => node.type === TYPE.TAG && node.tag === TEMPLATE)
          .forEach(node => {
            this.print({ node, isRootTemplate: true })
            // 遍历完一个模板后，记录下产物代码、源码
            this.outputList.push({
              code: this.code,
              sourceCode: this.sourceCode
            })
            // 重置内部状态，以便能复用实例
            this.tags = []
            this.code = ''
            this.sourceCode = ''
          })
        break
      case TYPE.TAG:
        if (node.tag === TEMPLATE && isRootTemplate === true) {
          this.sourceCode = node.loc.source
        }
        this.openTag(node)
        this.printChildren(node)
        this.closeTag({ node, isRootTemplate })
        break
      case TYPE.MUSTACHE:
        this.printMustache(node)
        break
      case TYPE.TEXT:
        this.printText(node)
        break
      case TYPE.COMMENT:
        this.printComment(node)
        break
      default:
        // do nothing
    }
  }
}

module.exports = {
  VueTemplateASTPrinter
}
