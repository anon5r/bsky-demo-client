import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { MentionList } from '../components/MentionList'
import { Agent } from '@atproto/api'

export const getMentionSuggestion = (agent: Agent) => ({
  items: async ({ query }: { query: string }) => {
    if (!query) return []
    try {
        const res = await agent.searchActorsTypeahead({ term: query, limit: 5 })
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
        popup[0].destroy()
        component.destroy()
      },
    }
  },
})
