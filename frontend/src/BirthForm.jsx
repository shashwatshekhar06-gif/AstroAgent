import React from 'react';
import { useState } from 'react'

function BirthForm({ onSubmit }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [place, setPlace] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    
    // Date validation
    if (!date) {
      newErrors.date = 'Date of birth is required'
    } else {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate > today) {
        newErrors.date = 'Date cannot be in the future'
      }
    }
    
    // Time validation
    if (!time) {
      newErrors.time = 'Time of birth is required'
    }
    
    // Place validation
    if (!place) {
      newErrors.place = 'Place of birth is required'
    } else if (place.trim().length < 2) {
      newErrors.place = 'Place must be at least 2 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({ date, time, place })
    }
  }

  const isFormValid = date && time && place && place.trim().length >= 2

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ 
        fontSize: '3.5rem', 
        marginBottom: '16px',
        color: '#1C1C1A',
        fontFamily: 'Cormorant Garamond, serif'
      }}>
        AstroAgent
      </h1>
      <p style={{ fontSize: '1.1rem', marginBottom: '48px', color: '#6B6B68' }}>
        Your celestial guide awaits
      </p>
      
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        padding: '48px',
        borderRadius: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              ...inputStyle,
              borderColor: errors.date ? '#DC2626' : '#E5E0D8'
            }}
            placeholder="Date of Birth"
          />
          {errors.date && <div style={errorStyle}>{errors.date}</div>}
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            style={{
              ...inputStyle,
              borderColor: errors.time ? '#DC2626' : '#E5E0D8'
            }}
          />
          {errors.time && <div style={errorStyle}>{errors.time}</div>}
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            required
            style={{
              ...inputStyle,
              borderColor: errors.place ? '#DC2626' : '#E5E0D8'
            }}
            placeholder="Place of Birth"
          />
          {errors.place && <div style={errorStyle}>{errors.place}</div>}
        </div>
        
        <button 
          type="submit" 
          disabled={!isFormValid}
          style={{
            ...buttonStyle,
            opacity: isFormValid ? 1 : 0.5,
            cursor: isFormValid ? 'pointer' : 'not-allowed'
          }}
        >
          Begin Your Journey
        </button>
      </form>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '16px 20px',
  border: '1px solid #E5E0D8',
  borderRadius: '12px',
  fontSize: '1rem',
  fontFamily: 'Inter, sans-serif',
  background: '#FAFAF9'
}

const buttonStyle = {
  width: '100%',
  padding: '16px',
  background: '#C4714A',
  color: 'white',
  border: 'none',
  borderRadius: '50px',
  fontSize: '1.1rem',
  fontWeight: '500',
  marginTop: '8px'
}

const errorStyle = {
  color: '#DC2626',
  fontSize: '0.85rem',
  marginTop: '4px',
  textAlign: 'left'
}

export default BirthForm
