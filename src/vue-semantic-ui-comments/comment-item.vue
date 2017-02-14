<template>
  <div class="comment" :id="comment.headers.author.timestamp" :style="{backgroundColor: preview ? 'aliceblue' : ''}">
    <a class="avatar" @click="toggleCollapsed">
      <img :src="avatar_url">
    </a>
    <div class="content">
      <a class="author" :title="`${comment.headers.author.name} <${comment.headers.author.email}>`">{{comment.headers.author.login || `${comment.headers.author.name} <${comment.headers.author.email}>`}}</a>
      <div class="metadata">
        <div class="date" :title="(new Date(comment.headers.author.timestamp * 1000)).toDateString()">{{time_ago}}</div>
      </div>
      <div class="text">
        <div v-html="safe_body"></div>
      </div>
      <div class="actions" v-if="!preview">
        <a @click="toggleCollapsed">Show Replies</a>
        <a>Edit</a>
      </div>
    </div>
    <slot v-if="!collapsed"></slot>
  </div>
</template>

<script>
import ReplyForm from './reply-form.vue'
import ago from 's-ago'
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt()

export default {
  name: 'comment-item',
  props: ['comment'],
  data () {
    return {
      collapsed: true
    }
  },
  computed: {
    avatar_url () {
      return `https://github.com/${this.comment.headers.author.login}.png`
    },
    time_ago () {
      return ago(new Date(Number(this.comment.headers.author.timestamp) * 1000))
    },
    safe_body () {
     return md.render(this.comment.message)
    },
    reply_count () {
      if (this.comment.replies === null || typeof this.comment.replies === 'undefined') {
        return 0
      } else {
        return this.comment.replies.length
      }
    }
  },
  methods: {
    compose () {
      this.show_reply_form = ! this.show_reply_form
    },
    submit (text) {
      this.show_reply_form = false
    },
    toggleCollapsed () {
      this.collapsed = !this.collapsed
    }
  },
  mounted () {
    this.$nextTick(() => {

    })
  },
  components: {
    ReplyForm
  }
}
</script>
