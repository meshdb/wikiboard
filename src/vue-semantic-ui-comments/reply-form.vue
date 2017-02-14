<template>
  <form class="ui reply form" @submit.prevent="submit">
    <div class="field">
      <simplemde ref="simplemde" :uid="parent_id" @change="updatePreview" ></simplemde>
    </div>
    <comment-item :preview="true" :comment="comment_preview" v-if="show_preview"></comment-item>
    <div class="ui slider checkbox">
      <input type="checkbox" v-model="show_preview" :id="checkboxId">
      <label :for="checkboxId">Show Preview</label>
    </div>
    <button type="submit" class="ui right floated big primary submit button">
      Post
    </button>
  </form>
</template>

<script>
import {debounce, uniqueId} from 'lodash'
import Simplemde from './simplemde.vue'
import CommentItem from './comment-item.vue'

export default {
  name: 'reply-form',
  components: {
    Simplemde,
    CommentItem,
  },
  data () {
    return {
      show_preview: false,
      comment_preview: null,
      checkboxId: uniqueId('checkbox-')
    }
  },
  props: ['parent_id'],
  methods: {
    value () {
      return this.$refs.simplemde.value()
    },
    submit () {
      this.$emit('submit', this.value())
      this.show_preview = false
      this.$refs.simplemde.value('')
    },
    updatePreview (text) {
      this.comment_preview = {
        author: 'wmhilton',
        timestamp: (new Date).valueOf(),
        replies: [],
        body: text
      }
    },
  },
}
</script>
