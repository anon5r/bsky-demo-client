import { RichText } from '@atproto/api'

/**
 * Converts Tiptap JSON to a plain string and computes facets for Bluesky.
 * Handles Mentions (with DID), Links (including Markdown-style), Hashtags, and Cashtags.
 */
export async function tiptapToRichText(editor: any, agent: any): Promise<RichText> {
  const json = editor.getJSON()
  let text = ''
  const explicitFacets: any[] = []

  // Helper to append text and track byte offsets
  const appendText = (newText: string, marks?: any[]) => {
    const start = new TextEncoder().encode(text).length
    text += newText
    const end = new TextEncoder().encode(text).length

    if (marks) {
      for (const mark of marks) {
        if (mark.type === 'link') {
          explicitFacets.push({
            index: { byteStart: start, byteEnd: end },
            features: [{ $type: 'app.bsky.richtext.facet#link', uri: mark.attrs.href }],
          })
        }
      }
    }
  }

  // Traverse Tiptap JSON
  const traverse = (node: any) => {
    if (node.type === 'text') {
      appendText(node.text, node.marks)
    } else if (node.type === 'mention') {
      const mentionText = `@${node.attrs.id}`
      const start = new TextEncoder().encode(text).length
      text += mentionText
      const end = new TextEncoder().encode(text).length
      
      explicitFacets.push({
        index: { byteStart: start, byteEnd: end },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: node.attrs.did || '' }],
      })
    } else if (node.type === 'paragraph' || node.type === 'hardBreak') {
      if (text.length > 0 && !text.endsWith('\n')) {
        appendText('\n')
      }
    }

    if (node.content) {
      node.content.forEach(traverse)
    }
  }

  if (json.content) {
    json.content.forEach(traverse)
  }

  // Create RichText and detect implicit facets (Hashtags, Cashtags, etc.)
  const rt = new RichText({ text })
  await rt.detectFacets(agent)

  // Merge facets: prioritization logic
  // We keep all Hashtags/Cashtags from detectFacets, 
  // but for links/mentions, we prioritize our explicit ones if they overlap.
  const mergedFacets = [...(rt.facets || [])]

  for (const explicit of explicitFacets) {
    // Check if this range is already covered by a mention or link from detectFacets
    const isOverlapping = mergedFacets.some(f => 
      (explicit.index.byteStart >= f.index.byteStart && explicit.index.byteStart < f.index.byteEnd) ||
      (explicit.index.byteEnd > f.index.byteStart && explicit.index.byteEnd <= f.index.byteEnd)
    )

    if (!isOverlapping) {
      mergedFacets.push(explicit)
    } else {
      // If overlapping, replace the auto-detected one with our explicit one (which has the DID/exact URI)
      const idx = mergedFacets.findIndex(f => 
        (explicit.index.byteStart >= f.index.byteStart && explicit.index.byteStart < f.index.byteEnd)
      )
      if (idx !== -1) {
        mergedFacets[idx] = explicit
      }
    }
  }

  // Sort facets by start index
  rt.facets = mergedFacets.sort((a, b) => a.index.byteStart - b.index.byteStart)

  return rt
}
