'use client'

import React, { useState, useCallback } from 'react'
import { SpeechToText } from './SpeechToText'
import TextToSpeech from './TextToSpeech'
import styles from './interviewer.module.css'
import speechToTextStyles from './speechToText.module.css'
import { buildInterviewPrompt } from '@/lib/llm_prompt'

interface InterviewerProps {
  problem: string
  currentCode: string
}

export function Interviewer({
  problem,
  currentCode
}: InterviewerProps) {
  const [userQuery, setUserQuery] = useState<string>('')
  const [llmReply, setLlmReply] = useState<string>('')
  const [isLlmGenerating, setIsLlmGenerating] = useState<boolean>(false)
  const [llmError, setLlmError] = useState<string | null>(null)

  const handleTranscription = useCallback(
    async (transcript: string) => {
      if (!transcript) return

      setUserQuery(transcript)
      setIsLlmGenerating(true)
      setLlmError(null)
      setLlmReply('')

      try {
        const prompt = buildInterviewPrompt(problem, currentCode, transcript)

        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response from LLM' }))
          throw new Error(errorData.error || `LLM API request failed: ${res.status} ${res.statusText}`)
        }

        const { reply: generatedReply } = (await res.json()) as { reply: string }

        if (!generatedReply) {
          throw new Error("Received empty reply from LLM assistant.")
        }
        setLlmReply(generatedReply)
      } catch (err) {
        console.error("Failed to get LLM reply:", err)
        setLlmError(err instanceof Error ? err.message : "An unknown error occurred while fetching the LLM reply.")
        setLlmReply('')
      } finally {
        setIsLlmGenerating(false)
      }
    },
    [problem, currentCode]
  )

  return (
    <>
      <SpeechToText onTranscription={handleTranscription} disabled={isLlmGenerating} />

      <div className={styles.qa_container}>
        <h4>Ask Interviewer</h4>

        {userQuery && !isLlmGenerating && !llmError && (
          <div className={`${speechToTextStyles.transcript_user} ${styles.user_query_display}`}>
            <h5>Your Question:</h5>
            <p>{userQuery}</p>
          </div>
        )}
        
        {isLlmGenerating && (
            <div className={styles.status_container}>
              <p>Interviewer is thinking...</p>
            </div>
        )}

        {llmError && (
          <div className={styles.status_container}>
              <p className="text-red-600">LLM Error: {llmError}</p>
          </div>
        )}

        {llmReply && !isLlmGenerating && !llmError && (
          <div className={styles.interviewer_reply}>
            <h5>Interviewer Reply:</h5>
            <TextToSpeech text={llmReply} />
            <p>{llmReply}</p>
          </div>
        )}
      </div>
    </>
  )
}