'use client'

import React, { useRef, useState, useEffect } from 'react'

interface TextToSpeechProps {
  text: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [generatedForText, setGeneratedForText] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const currentAudioRef = audioRef.current;

    if (!text) {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      if (currentAudioRef) {
        currentAudioRef.pause()
        currentAudioRef.src = ''
      }
      setGeneratedForText(null)
      return
    }

    if (text === generatedForText && audioUrl && currentAudioRef?.src) {
      return
    }

    if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
    }
    if (currentAudioRef) {
        currentAudioRef.pause()
        currentAudioRef.src = ''
    }

    setGeneratedForText(null)

    async function fetchAndPlayAudio() {
      try {
        const response = await fetch('/api/textToSpeech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`TTS API Failed: ${response.status} ${errorText || response.statusText}`)
        }

        const audioBlob = await response.blob()
        if (cancelled) {
          return
        }

        const newAudioUrl = URL.createObjectURL(audioBlob)
        setAudioUrl(newAudioUrl)
        setGeneratedForText(text)

        if (currentAudioRef) {
          currentAudioRef.src = newAudioUrl
          try {
            await currentAudioRef.play()
          } catch (playError) {
            console.error("Audio autoplay failed:", playError)
            URL.revokeObjectURL(newAudioUrl)
            setAudioUrl(null)
            setGeneratedForText(null)
          }
        }
      } catch (err) {
        console.error('TTS fetch/play error:', err)
        if (!cancelled) {
          setAudioUrl(null)
          setGeneratedForText(null)
        }
      }
    }

    fetchAndPlayAudio()

    return () => {
      cancelled = true
      if (currentAudioRef) {
        currentAudioRef.pause()
      }
    }
  }, [text])

  useEffect(() => {
    const currentAudioUrl = audioUrl;
    return () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl)
      }
    }
  }, [audioUrl])

  return (
    <>
      <audio ref={audioRef} hidden />
    </>
  )
}

export default TextToSpeech
