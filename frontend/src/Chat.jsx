import React, { useState, useEffect, useRef } from 'react'

function Chat({ birthDetails, sessionId, onNewMessage }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showToolActivity, setShowToolActivity] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load existing messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`http://localhost:8000/sessions/${sessionId}/messages`)
        const data = await response.json()
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages)
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadMessages()
  }, [sessionId])

  const sendMessage = async (messageText) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isStreaming) return

    setInput('')
    const newMessages = [...messages, { role: 'user', content: textToSend }]
    setMessages(newMessages)
    setIsStreaming(true)
    setShowToolActivity(false)

    try {
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: textToSend,
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
      
      // Notify parent to refresh session list
      if (onNewMessage) {
        onNewMessage()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsStreaming(false)
      setShowToolActivity(false)
    }
  }

  if (isLoadingHistory) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p style={{ color: '#C4714A', fontStyle: 'italic' }}>Loading conversation...</p>
      </div>
    )
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
      width: '100%'
    }}>
      <h2 style={{ 
        fontSize: '2.5rem', 
        marginBottom: '24px',
        textAlign: 'center',
        fontFamily: 'Cormorant Garamond, serif',
        flexShrink: 0
      }}>
        AstroAgent
      </h2>

      <div 
        ref={messagesContainerRef}
        style={{
          flex: 1,
          background: 'white',
          borderRadius: '24px',
          padding: '32px',
          overflowY: 'auto',
          marginBottom: '20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {messages.length === 0 ? (
          // Welcome state when no messages
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '24px' }}>✦</div>
            <h3 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1.8rem',
              color: '#1C1C1A',
              marginBottom: '12px',
              fontWeight: 600
            }}>
              Welcome, dear one
            </h3>
            <p style={{
              fontSize: '0.95rem',
              color: '#8B8680',
              marginBottom: '32px',
              maxWidth: '400px'
            }}>
              Ask me about your birth chart, daily transits, or anything about the stars.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {['What is my sun sign?', 'How is today for me?', 'Tell me about my career'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  style={{
                    padding: '10px 20px',
                    background: '#F5F0E8',
                    border: '1px solid #E5E0D8',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    color: '#1C1C1A',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#C4714A'
                    e.currentTarget.style.color = 'white'
                    e.currentTarget.style.borderColor = '#C4714A'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F5F0E8'
                    e.currentTarget.style.color = '#1C1C1A'
                    e.currentTarget.style.borderColor = '#E5E0D8'
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Messages display
          <>
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
                AstroAgent is thinking...
              </p>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
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
