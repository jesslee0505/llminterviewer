'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Select, { SingleValue } from 'react-select';
import { Editor } from '@monaco-editor/react';
import styles from './page.module.css';
import '../../styles/globals.css';
import { Interviewer } from './components/Interviewer';
import dynamic from 'next/dynamic';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-okaidia.css';
import AddQuestionForm from './components/AddQuestionForm';

type SelectProps = React.ComponentProps<typeof Select<QuestionOption>>;
const DynamicSelect = dynamic<SelectProps>(() => import('react-select'), {
  ssr: false,
  loading: () => <div className={styles.selectLoadingPlaceholder}>Loading...</div>
});

interface TestCase {
  input: unknown;
  expected_output: unknown;
}

interface Solution {
  code: string;
  summary: string;
  language?: string;
  title?: string;
}

interface Example {
  input: unknown;
  output: unknown;
  explanation?: string;
  [key: string]: unknown;
}

interface QuestionData {
  _id: string;
  id: number;
  title:string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  examples: Example[];
  constraints?: string[];
  starting_code: string;
  solutions?: Solution[];
  test_cases?: TestCase[];
}

interface QuestionOption {
  value: string;
  label: string;
}

type PanelTab = 'problem' | 'solutions';

interface RunResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    status: 'Passed' | 'Failed' | 'Error';
    errorMessage?: string;
    stdout?: string;
    stderr?: string;
}

interface HighlightedCodeBlockProps {
  code: string;
  language: string;
}

const HighlightedCodeBlock: React.FC<HighlightedCodeBlockProps> = ({ code, language }) => {
  const codeRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);
  return (
    <pre className={`${styles.solutionCode} language-${language}`}>
      <code ref={codeRef} className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
};

const CodeEditor: React.FC = () => {
  const [questionOptions, setQuestionOptions] = useState<QuestionOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<QuestionOption | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [code, setCode] = useState<string>('// Select a question');
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(300);
  const [isDraggingPanelResizer, setIsDraggingPanelResizer] = useState(false);
  const [questionDetailsFlexBasis, setQuestionDetailsFlexBasis] = useState('60%');
  const [isDraggingHorizontalResizer, setIsDraggingHorizontalResizer] = useState(false);
  const questionPanelRef = useRef<HTMLDivElement>(null);
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>('problem');
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [runResults, setRunResults] = useState<RunResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState<boolean>(false);

  useEffect(() => {
    setPanelWidth(window.innerWidth * 0.4);
  }, []);

  const fetchQuestionList = useCallback(async (selectNewest?: boolean) => {
    setIsLoadingList(true);
    setError(null);
    const currentQuestionOptions = questionOptions; 
    try {
      const response = await fetch('/api/questions?list=true');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const options: QuestionOption[] = result.data.map((q: { _id: string; title: string }) => ({ value: q._id, label: q.title }));
        setQuestionOptions(options);

        if (selectNewest && options.length > 0) {
            const newOption = options.find((opt: QuestionOption) => !currentQuestionOptions.some(oldOpt => oldOpt.value === opt.value)) || options[options.length - 1];
            if (newOption) setSelectedOption(newOption);
        } else if (!selectedOption && options.length > 0) {
          const defaultOption = options.find((opt: QuestionOption) => opt.label === 'Two Sum');
          if (defaultOption) setSelectedOption(defaultOption);
          else setSelectedOption(options[0]);
        } else if (options.length === 0) {
          setError("No questions found.");
          setSelectedOption(null);
        } else if (selectedOption && !options.find((opt: QuestionOption) => opt.value === selectedOption.value)) {
           setSelectedOption(options.length > 0 ? options[0] : null);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch question list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoadingList(false);
    }
  }, [selectedOption, questionOptions]);

  useEffect(() => {
    fetchQuestionList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedOption) {
      setActiveQuestion(null);
      setCode('// Select a question from the dropdown');
      setRunResults(null); setRunError(null);
      return;
    }
    const fetchQuestionDetails = async () => {
      setIsLoadingQuestion(true);
      setError(null); setActiveQuestion(null);
      setRunResults(null); setRunError(null);
      setCode('// Loading question...');
      try {
        const response = await fetch(`/api/questions?id=${selectedOption.value}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.success) {
          const questionData = result.data as QuestionData;
          setActiveQuestion(questionData);
          setCode(questionData.starting_code || '// No starting code provided.');
          setActivePanelTab('problem');
        } else {
          throw new Error(result.error || `Failed to fetch question: ${selectedOption.label}`);
        }
      } catch (err) {
        setActiveQuestion(null);
        setCode('// Error loading question');
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoadingQuestion(false);
      }
    };
    fetchQuestionDetails();
  }, [selectedOption]);

  useEffect(() => {
    if (activePanelTab === 'solutions' && activeQuestion?.solutions) {
      Prism.highlightAll();
    }
  }, [activePanelTab, activeQuestion?.solutions]);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value ?? '');
    setRunResults(null); setRunError(null);
  };

  const handleQuestionSelect = (selected: SingleValue<QuestionOption>) => {
    setSelectedOption(selected);
    setRunResults(null); setRunError(null);
    setIsSubmittingCode(false);
  };

  const startDraggingPanelResizer = (e: React.MouseEvent) => {
    e.preventDefault(); setIsDraggingPanelResizer(true);
  };
  const startDraggingHorizontalResizer = (e: React.MouseEvent) => {
    e.preventDefault(); setIsDraggingHorizontalResizer(true);
  };

  const handleRunCode = useCallback(async () => {
    if (!activeQuestion || !code || isSubmittingCode) return;
    setIsSubmittingCode(true);
    setRunResults(null); setRunError(null);
    try {
      const response = await fetch('/api/runCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, questionId: activeQuestion._id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Execution failed: ${response.status}`);
      if (result.success && Array.isArray(result.results)) {
        setRunResults(result.results as RunResult[]);
      } else if (result.error) {
        setRunError(result.error); setRunResults([]);
      } else {
        throw new Error('Invalid response from execution server.');
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Execution error.');
      setRunResults(null);
    } finally {
      setIsSubmittingCode(false);
    }
  }, [activeQuestion, code, isSubmittingCode]);

   useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPanelResizer) {
        const newWidth = Math.max(200, e.clientX);
        const maxWidth = window.innerWidth * 0.7;
        setPanelWidth(Math.min(newWidth, maxWidth));
      }
    };
    const handleMouseUp = () => setIsDraggingPanelResizer(false);
    if (isDraggingPanelResizer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPanelResizer]);

  useEffect(() => {
    const handleHorizontalMouseMove = (e: MouseEvent) => {
      if (!isDraggingHorizontalResizer || !questionPanelRef.current) return;
      const panelRect = questionPanelRef.current.getBoundingClientRect();
      const newHeight = e.clientY - panelRect.top;
      const totalHeight = panelRect.height;
      const minPixelHeight = 100;
      const maxPixelHeight = totalHeight - 100;
      const clampedHeight = Math.max(minPixelHeight, Math.min(newHeight, maxPixelHeight));
      setQuestionDetailsFlexBasis(`${clampedHeight}px`);
    };
    const handleHorizontalMouseUp = () => setIsDraggingHorizontalResizer(false);
    if (isDraggingHorizontalResizer) {
      document.addEventListener('mousemove', handleHorizontalMouseMove);
      document.addEventListener('mouseup', handleHorizontalMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleHorizontalMouseMove);
      document.removeEventListener('mouseup', handleHorizontalMouseUp);
    };
  }, [isDraggingHorizontalResizer]);

  const formatConstraint = (constraint: string) => {
    const formatted = constraint.replace(/(-?\d+)\^(\d+)/g, '$1<sup>$2</sup>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const panelContent = useMemo(() => {
    if (isLoadingQuestion) return <p>Loading question details...</p>;
    if (error && !activeQuestion) return <p className={styles.errorText}>Error: {error}</p>;
    if (!activeQuestion) return <p>Select a question.</p>;
    switch (activePanelTab) {
      case 'problem':
        return (
           <div className={styles.contentSection}>
              <p className={styles.difficultyText}><strong>Difficulty:</strong> {activeQuestion.difficulty}</p>
              <div className={styles.descriptionText} dangerouslySetInnerHTML={{ __html: activeQuestion.description.replace(/`/g, '') || '' }} />
             {activeQuestion.examples && activeQuestion.examples.length > 0 && (
               <div>
                 {activeQuestion.examples.map((ex, index) => (
                   <div key={index} className={styles.exampleBlock}>
                      <div className={styles.exampleTitle}>Example {index + 1}:</div>
                      <pre className={styles.examplePre}>
                        <strong>Input:</strong> {typeof ex.input === 'object' ? JSON.stringify(ex.input) : String(ex.input)}{'\n'}
                        <strong>Output:</strong> {typeof ex.output === 'object' ? JSON.stringify(ex.output) : String(ex.output)}
                      </pre>
                      {ex.explanation && <p className={styles.exampleExplanation}><strong>Explanation:</strong> {ex.explanation}</p>}
                   </div>
                 ))}
               </div>
             )}
             {activeQuestion.constraints && activeQuestion.constraints.length > 0 && (
                <div className={styles.constraintsSection}>
                    <h4 className={styles.constraintsHeading}>Constraints:</h4>
                    <ul className={styles.constraintsList}>
                        {activeQuestion.constraints.map((c, i) => <li key={i}>{formatConstraint(c)}</li>)}
                    </ul>
                </div>
             )}
           </div>
        );
      case 'solutions':
         return (
            <div className={styles.contentSection}>
              <h3 className={styles.solutionsMainTitle}>Solutions</h3>
              {activeQuestion.solutions && activeQuestion.solutions.length > 0 ? (
                activeQuestion.solutions.map((solution, index) => (
                  <div key={index} className={styles.solutionBlock}>
                    {solution.title && <h4 className={styles.solutionTitle}>{solution.title}</h4>}
                    <p className={styles.solutionSummary}>{solution.summary}</p>
                    <HighlightedCodeBlock code={solution.code} language={solution.language || 'python'}/>
                    {index < activeQuestion.solutions!.length - 1 && <hr className={styles.solutionSeparator} />}
                  </div>
                ))
              ) : ( <p>No official solutions available yet.</p> )}
            </div>
          );
      default: return null;
    }
  }, [activeQuestion, activePanelTab, isLoadingQuestion, error]);

  const renderResultsPanel = () => {
    if (isSubmittingCode) return <div className={styles.resultsPanel}>Running tests...</div>;
    if (runError) return <div className={`${styles.resultsPanel} ${styles.errorResult}`}>Error: {runError}</div>;
    if (!runResults) return null;
    if (runResults.length === 0 && !runError) return <div className={styles.resultsPanel}>No test results.</div>;
    const allPassed = runResults.every(r => r.status === 'Passed');
    const formatDisplayValue = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return 'N/A';
      try { return JSON.stringify(JSON.parse(val)); } catch { return val; }
    };
    return (
      <div className={styles.resultsPanel}>
        <h3>Test Results: {allPassed ? <span className={styles.passResult}>All Passed ✅</span> : <span className={styles.failResult}>Some Failed ❌</span>}</h3>
        {runResults.map((result, index) => {
          const displayInput = formatDisplayValue(result.input);
          const displayExpected = formatDisplayValue(result.expectedOutput);
          const displayActual = result.status === 'Error' ? result.actualOutput : formatDisplayValue(result.actualOutput);
          return (
            <div key={index} className={styles.resultCase}>
              <strong className={result.status === 'Passed' ? styles.passResult : styles.failResult}>Test Case {index + 1}: {result.status}</strong>
              <div className={styles.resultDetailsContainer}>
                <div className={styles.resultDetailItem}><span className={styles.resultLabel}>Input:</span><code className={styles.resultValue}>{displayInput}</code></div>
                <div className={styles.resultDetailItem}><span className={styles.resultLabel}>Expected:</span><code className={styles.resultValue}>{displayExpected}</code></div>
                {result.status !== 'Error' && (<div className={styles.resultDetailItem}><span className={styles.resultLabel}>Actual:</span><code className={styles.resultValue}>{displayActual}</code></div>)}
                {result.status === 'Error' && (<div className={styles.resultDetailItem}><span className={styles.resultLabel}>Error:</span><pre className={styles.resultErrorValue}>{result.errorMessage || displayActual || 'Unknown error'}</pre></div>)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleQuestionAdded = () => {
    fetchQuestionList(true);
  };

  return (
    <div className={styles.container}>
      {showAddQuestionForm && (
        <AddQuestionForm
          onQuestionAdded={handleQuestionAdded}
          onClose={() => setShowAddQuestionForm(false)}
        />
      )}
      <div ref={questionPanelRef} className={styles.questionPanel} style={{ width: `${panelWidth}px` }}>
        <div className={styles.questionSelectionHeader}>
            <DynamicSelect
            options={questionOptions}
            value={selectedOption}
            onChange={handleQuestionSelect}
            isLoading={isLoadingList}
            placeholder={isLoadingList ? 'Loading...' : 'Select a question...'}
            isClearable={false}
            isSearchable
            className={styles.questionDropdown}
            classNamePrefix="select"
            instanceId={useMemo(() => `select-instance-${Math.random()}`, [])}
            />
            <button onClick={() => setShowAddQuestionForm(true)} className={styles.addQuestionButton} title="Add New Question">
            +
            </button>
        </div>
        {activeQuestion && !isLoadingQuestion && (<h2 className={styles.selectedQuestionTitle}>{activeQuestion.title}</h2>)}
        {activeQuestion && !isLoadingQuestion && (
            <div className={styles.panelTabs}>
              <div className={`${styles.panelTab} ${activePanelTab === 'problem' ? styles.activePanelTab : ''}`} onClick={() => setActivePanelTab('problem')}>Problem</div>
              {activeQuestion.solutions && activeQuestion.solutions.length > 0 && (<div className={`${styles.panelTab} ${activePanelTab === 'solutions' ? styles.activePanelTab : ''}`} onClick={() => setActivePanelTab('solutions')}>Solutions</div>)}
            </div>
        )}
        <div className={styles.questionDetails} style={{ flexBasis: questionDetailsFlexBasis, minHeight: 0 }}>{panelContent}</div>
        <div className={styles.horizontalResizer} onMouseDown={startDraggingHorizontalResizer} />
        {activeQuestion && !isLoadingQuestion && (
          <main className={styles.interviewerSection} style={{ flexGrow: 1, minHeight: 0 }}>
            <Interviewer problem={activeQuestion.description ?? 'No description.'} currentCode={code}/>
          </main>
        )}
      </div>
      <div className={styles.resizer} onMouseDown={startDraggingPanelResizer} />
      <div className={styles.editorPanel}>
        <div className={styles.editorControls}>
            <button onClick={handleRunCode} disabled={!activeQuestion || isSubmittingCode || isLoadingQuestion} className={styles.runButton}>
                {isSubmittingCode ? 'Running...' : 'Run Code'}
            </button>
        </div>
        <div className={styles.editorContainer}>
            <Editor
            height="100%" language="python" theme="vs" value={code} onChange={handleEditorChange}
            key={activeQuestion?._id || 'editor-placeholder'}
            options={{ readOnly: !activeQuestion || isSubmittingCode, minimap: { enabled: true }, fontSize: 14 }}/>
        </div>
        <div className={styles.resultsContainer}>{renderResultsPanel()}</div>
      </div>
    </div>
  );
};

export default CodeEditor;
