<template>
  <textarea v-model="value" @onchange="$emit('change')"></textarea>
</template>

<style>
@import url('https://fonts.googleapis.com/css?family=Fira+Mono');
.CodeMirror {
  font-family: 'Fira Mono', monospace;
}
.CodeMirror, .CodeMirror-scroll {
    min-height: 100px;
}
</style>

<script>
import SimpleMDE from 'simplemde'
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt()

export default {
  name: 'simplemde',
  props: ['uid'],
  mounted () {
    this.$nextTick(() => {
      // code that assumes this.$el is in-document
      // console.log('hello?')
      window.SimpleMDE = SimpleMDE
      this.simplemde = new SimpleMDE({
        element: this.$el,
        toolbar: false,
        status: false,
        previewRender: (str) => md.render(str),
        autosave: {
          enabled: true,
          delay: 1000,
          uniqueId: this.uid.toString()
        }
      })
      this.simplemde.codemirror.on("change", () => {
        this.$emit('change', this.simplemde.value())
      })
      this.$emit('change', this.simplemde.value())
    })
  },
  methods: {
    value () {
      return this.simplemde.value()
    }
  }
}
</script>
