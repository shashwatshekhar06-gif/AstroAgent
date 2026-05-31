import { useState, useEffect, useRef } from 'react'

function Chat({ birthDetails, sessionId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showToolActivity, setShowToolActivity] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsStreaming(true)
    setShowToolActivity(false)

    try {
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
          birth_details: birthDetails
        })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''
      let assistantMessageIndex = newMessages.length

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.token) {
                assistantMessage += parsed.token
                
                // Check for tool activity
                const toolKeywords = ['geocode', 'compute', 'knowledge', 'transit']
                const hasToolActivity = toolKeywords.some(kw => assistantMessage.toLowerCase().includes(kw))
                if (hasToolActivity && assistantMessage.length < 50) {
                  setShowToolActivity(true)
                } else if (assistantMessage.length > 50) {
                  setShowToolActivity(false)
                }
                
                setMessages(prev => {
                  const updated = [...prev]
                  updated[assistantMessageIndex] = { role: 'assistant', content: assistantMessage }
                  return updated
                })
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsStreaming(false)
      setShowToolActivity(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ 
        fontSize: '2.5rem', 
        marginBottom: '32px', 
        textAlign: 'center',
        fontFamily: 'Cormorant Garamond, serif'
      }}>
        Aradhana
      </h2>

      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '32px',
        minHeight: '500px',
        maxHeight: '600px',
        overflowY: 'auto',
        marginBottom: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'assistant' && showToolActivity && i === messages.length - 1 && (
              <div style={{
                fontSize: '0.9rem',
                color: '#C4714A',
                fontStyle: 'italic',
                marginBottom: '8px'
              }}>
                🔧 Calling tools...
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '16px'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '16px 20px',
                borderRadius: '16px',
                background: msg.role === 'user' ? '#C4714A' : '#F5F0E8',
                color: msg.role === 'user' ? 'white' : '#1C1C1A'
              }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <p style={{ color: '#C4714A', fontStyle: 'italic', fontSize: '0.95rem' }}>
            Aradhana is thinking...
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about your chart..."
          style={{
            flex: 1,
            padding: '16px 20px',
            border: '1px solid #E5E0D8',
            borderRadius: '50px',
            fontSize: '1rem',
            background: 'white'
          }}
        />
        <button onClick={sendMessage} disabled={isStreaming} style={{
          padding: '16px 32px',
          background: '#C4714A',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: 'pointer',
          opacity: isStreaming ? 0.6 : 1
        }}>
          Send
        </button>
      </div>
    </div>
  )
}

export default Chat
