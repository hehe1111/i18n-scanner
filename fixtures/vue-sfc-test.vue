<template>
  <div class="card">
    <slot>
      <span>这是一段中文</span>
    </slot>
  </div>
</template>

<script lang="ts" setup></script>

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
