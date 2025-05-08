'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import styles from '../styles/page.module.css';
import BlobBackgroundLayout from '../components/BlobBackgroundLayout';

const solutions = [`        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[j] == target - nums[i]:
                    return [i, j]

        return []`,`        hashmap = {}
        for i in range(len(nums)):
            hashmap[nums[i]] = i
        for i in range(len(nums)):
            complement = target - nums[i]
            if complement in hashmap and hashmap[complement] != i:
                return [i, hashmap[complement]]

        return []`
];

export default function LandingPage() {

  const staticCodeHeader = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:`; // Removed stray backslash

  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [typedCodeBody, setTypedCodeBody] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'typing' | 'deleting'>('typing');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const currentCode = solutions[currentSolutionIndex];
      const typingSpeed = 50;
      const deletingSpeed = 30;
      const endPauseDuration = 1000;
      const switchPauseDuration = 1000;

      if (animationPhase === 'typing') {
          if (currentIndex < currentCode.length) {
              timeoutRef.current = setTimeout(() => {
                  setTypedCodeBody((prev) => prev + currentCode[currentIndex]);
                  setCurrentIndex((prev) => prev + 1);
              }, typingSpeed);
          } else {
              timeoutRef.current = setTimeout(() => {
                  setAnimationPhase('deleting');
              }, endPauseDuration);
          }
      }
      else if (animationPhase === 'deleting') {
          if (typedCodeBody.length > 0) {
              timeoutRef.current = setTimeout(() => {
                  setTypedCodeBody((prev) => prev.slice(0, -1));
              }, deletingSpeed);
          } else {
              timeoutRef.current = setTimeout(() => {
                  const nextIndex = (currentSolutionIndex + 1) % solutions.length;
                  setCurrentSolutionIndex(nextIndex);
                  setCurrentIndex(0);
                  setAnimationPhase('typing');
              }, switchPauseDuration);
          }
      }

      return () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };

  }, [animationPhase, currentIndex, typedCodeBody.length, currentSolutionIndex]);

  return (
    <BlobBackgroundLayout>
      <div className={styles.container}>
        <nav className={styles.navbar}>
          <div className={styles.navContent}>
            <div className={styles.logoContainer}>
               <Link href="/" className={styles.logoLink}>
                 LLMInterviewer
               </Link>
            </div>
            <div className={styles.navActions}>
              <Link href="/login" className={styles.loginButton}>
                Login
              </Link>
            </div>
          </div>
        </nav>

        <main className={styles.mainContent}>
          <div className={styles.mainText}>
            <h1 className={styles.motto}>
              A Better Way to Learn
            </h1>
            <p className={styles.subheadline}>
              Learn and prepare for technical interviews.
            </p>
            <div className={styles.ctaContainer}>
              <Link href="/login?mode=register" className={styles.ctaButton}>
                Get Started
              </Link>
            </div>
          </div>

          <div className={styles.terminalContainer}>
             <div className={styles.terminalFrame}>
                <div className={styles.terminalHeader}>
                  <div className={styles.terminalDots}>
                    <span className={`${styles.dot} ${styles.red}`}></span>
                    <span className={`${styles.dot} ${styles.yellow}`}></span>
                    <span className={`${styles.dot} ${styles.green}`}></span>
                  </div>
                  <div className={styles.terminalTitle}>code</div>
                </div>

                <div className={styles.terminalBody}>
                    <SyntaxHighlighter
                      language="python"
                      style={vscDarkPlus}
                      customStyle={{ background: 'transparent', margin: 0, padding: 0, fontSize: 'inherit', fontFamily: 'inherit' }}
                      wrapLines={true}
                      lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
                    >
                      {staticCodeHeader}
                    </SyntaxHighlighter>

                    <SyntaxHighlighter
                      language="python"
                      style={vscDarkPlus}
                      customStyle={{ background: 'transparent', margin: 0, padding: 0, fontSize: 'inherit', fontFamily: 'inherit' }}
                      wrapLines={true}
                      lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
                    >
                      {typedCodeBody || '\u00A0'}
                    </SyntaxHighlighter>
                </div>
              </div>
          </div>
        </main>
      </div>
    </BlobBackgroundLayout>
  );
}