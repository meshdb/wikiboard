<template>
  <div class="ui threaded comments" v-if="children.length > 0">
    <comment-item :comment="comment" v-for="comment of children">
      <comment-list :comments="comments" :parent="comment.sha"></comment-list>
    </comment-item>
    <!-- <reply-form ref="replyForm" v-if="show_reply_form" :parent_id="comment.uuid" @submit="submit"></reply-form> -->
  </div>
</template>

<script>
import _ from 'lodash'
import ReplyForm from './reply-form.vue'
import CommentItem from './comment-item.vue'
import ago from 's-ago'
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt()

export default {
  name: 'comment-list',
  components: {
    CommentItem,
    ReplyForm
  },
  data () {
    return {
      show_reply_form: false,
      reply_body: ''
    }
  },
  props: ['comments', 'parent'],
  methods: {
    compose () {
      this.show_reply_form = ! this.show_reply_form
    },
    submit (text) {
      this.show_reply_form = false
    }
  },
  computed: {
    shas () {
      return _.map(this.comments, 'sha')
    },
    children () {
      if (this.parent) return this.comments.filter(x => x.headers.parent.includes(this.parent))
      return this.orphans
    },
    orphans () {
      return this.comments.filter(x => x.headers.parent.reduce((x,y) => x && !this.shas.includes(y), true))
    },
  },
  mounted () {
    this.$nextTick(() => {

    })
  },
}
</script>
