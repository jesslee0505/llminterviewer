'use client'

import React, { useState, useRef, useCallback } from 'react'
import styles from './speechToText.module.css'
import { MicIcon, StopIcon, HourglassIcon } from './common/Icons'

export interface SpeechToTextProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function SpeechToText({ onTranscription, disabled }: SpeechToTextProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [sttError, setSttError] = useState<string | null>(null)

  const audioChunksRef = useRef<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/speechToText', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server responded with ${response.status}: ${errorText || 'Failed to transcribe'}`)
      }

      const data = await response.json()

      if (data.text) {
        onTranscription(data.text)
      } else {
        setSttError('Transcription returned no text.')
      }
    } catch (err) {
      console.error('Speech to text error:', err)
      setSttError(err instanceof Error ? err.message : 'Speech recognition failed.')
    } finally {
      setStatus('idle')
    }
  }, [onTranscription])


  const handleAudioStop = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      setStatus('idle')
      setSttError('No audio data recorded.')
      return
    }
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      await processAudio(audioBlob)
    } catch (err) {
      console.error('Error processing audio:', err)
      setSttError('Failed to process audio. Please try again.')
      setStatus('idle')
    }
  }, [processAudio])

  const toggleRecording = async () => {
    setSttError(null)
    if (status === 'recording') {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
    } else if (status === 'idle') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
            setStatus('processing');
            handleAudioStop();
        }
        
        mediaRecorder.start()
        setStatus('recording')
      } catch (err) {
        console.error('Error accessing microphone:', err)
        setSttError('Could not access microphone. Please check permissions.')
        setStatus('idle')
      }
    }
  }


  const getButtonClass = () => {
    if (status === 'recording') return `${styles.record_button} ${styles.recording}`
    if (status === 'processing') return `${styles.record_button} ${styles.processing}`
    return styles.record_button
  }

  const currentIcon = () => {
    if (status === 'recording') return <StopIcon />;
    if (status === 'processing') return <HourglassIcon />;
    return <MicIcon />;
  }

  return (
    <>
      <div className={styles.record_button_container}>
        <button
          className={getButtonClass()}
          onClick={toggleRecording}
          disabled={disabled || status === 'processing'}
          aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          {currentIcon()}
        </button>
      </div>
      <div className={styles.convo_status}>
        {status === 'processing' && <p>Processing your question...</p>}
        {sttError && <p className="text-red-500">{sttError}</p>}
      </div>
    </>
  )
}
