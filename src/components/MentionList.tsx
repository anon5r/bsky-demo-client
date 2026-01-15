import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item.handle, label: item.handle })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    const timer = setTimeout(() => setSelectedIndex(0), 0)
    return () => clearTimeout(timer)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }
      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }
      if (event.key === 'Enter') {
        enterHandler()
        return true
      }
      return false
    },
  }))

  return (
    <div className="mention-list">
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            className={`mention-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.avatar ? (
              <img src={item.avatar} alt="" className="avatar-small" />
            ) : (
              <div className="avatar-small" style={{ background: '#ccc' }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.displayName || item.handle}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>@{item.handle}</span>
            </div>
          </button>
        ))
      ) : (
        <div className="mention-item" style={{ cursor: 'default' }}>No result</div>
      )}
    </div>
  )
})
