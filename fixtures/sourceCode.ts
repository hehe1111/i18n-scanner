interface IDoc {
  title: string
  content: string
  meta: Record<string, any>
}

class Doc implements IDoc {
  title: string
  content: string
  meta: Record<string, any>

  constructor(title: string, content: string, meta: Record<string, any>) {
    this.title = title
    this.content = content
    this.meta = {}
  }
}


function write(doc: Doc): string {
  return '测试写'
}

function read(doc: Doc): string {
  return '测试读'
}

async function foo(): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('测试 async/await')
    }, 1000);
   })
}

async function bar(): Promise<void> {
  await foo()
}

bar()

const a = { a: '测试 hello' }
const b = { b: '测试 world' }
const c = { ...a, ...b }
