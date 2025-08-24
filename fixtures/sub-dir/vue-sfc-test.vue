<template>
  <div class="card">
    <slot>
      <span>这是一段中文</span>
    </slot>
  </div>
</template>

<script lang="ts" setup>

const a = '你好'

function foo() {
  return '这是一个函数'
}

class Bar {
  name: string

  constructor() {
    this.name = 'Bar 类'
  }

  goodWeather() {
    return '今天天气好'
  }
}
</script>

<style lang="less">
.card {
  width: 200px;
  height: 100px;
  background: #eee;
  border: 1px solid #ddd;
  display: flex;
  padding: 10;
  justify-content: center;
  align-items: center;
}
</style>
