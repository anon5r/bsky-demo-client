import { ReactRenderer, markInputRule, Mark, mergeAttributes } from '@tiptap/react'
import tippy from 'tippy.js'
import { MentionList } from '../components/MentionList'
import Mention from '@tiptap/extension-mention'
import Link from '@tiptap/extension-link'

// --- Mentions Configuration ---
export const getMentionSuggestion = (agent: any) => ({
  items: async ({ query }: { query: string }) => {
    if (!query) return []
    try {
      const res = await agent.searchActorsTypeahead({ term: query, limit: 8 })
      return res.data.actors
    } catch (e) {
      console.error(e)
      return []
    }
  },
  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },
      onUpdate(props: any) {
        component.updateProps(props)
        if (!props.clientRect) {
          return
        }
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },
      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },
      onExit() {
        if (popup && popup[0]) popup[0].destroy()
        if (component) component.destroy()
      },
    }
  },
})

// --- Markdown Link Input Rule ---
const linkInputRegex = /\[(.+?)\]\((.+?)\)$/

// --- Custom Link Extension ---
export const CustomLink = Link.extend({
  addInputRules() {
    return [
      markInputRule({
        find: linkInputRegex,
        type: this.type,
        getAttributes: match => {
          return { href: match[2] }
        },
      }),
    ]
  },
}).configure({
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  HTMLAttributes: {
    class: 'external-link',
  },
})

// --- Hashtag & Cashtag Extension (Visual only) ---
export const Hashtag = Mark.create({
  name: 'hashtag',
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'hashtag',
      },
    }
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
  addInputRules() {
    return [
      markInputRule({
        find: /(?:^|\s)(#[^\s!@#$%^&*()=+./,[]{}:;?<>]+)$/,
        type: this.type,
      }),
    ]
  },
})

export const Cashtag = Mark.create({
  name: 'cashtag',
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'cashtag',
      },
    }
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
  addInputRules() {
    return [
      markInputRule({
        find: /(?:^|\s)(\$[A-Z]{1,10})$/,
        type: this.type,
      }),
    ]
  },
})

// --- Mention Extension ---
export const CustomMention = (agent: any) => Mention.configure({
  HTMLAttributes: {
    class: 'mention',
  },
  suggestion: getMentionSuggestion(agent),
})
