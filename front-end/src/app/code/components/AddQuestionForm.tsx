'use client';

import React, { useState } from 'react';
import styles from './addQuestionForm.module.css';

interface QuestionFormData {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | '';
  examples: string;
  constraints: string[];
  starting_code: string;
  test_cases: string;
}

interface AddQuestionFormProps {
  onQuestionAdded: () => void;
  onClose: () => void;
}

const AddQuestionForm: React.FC<AddQuestionFormProps> = ({ onQuestionAdded, onClose }) => {
  const [formData, setFormData] = useState<QuestionFormData>({
    id: '',
    title: '',
    description: '',
    difficulty: '',
    examples: '[]',
    constraints: [],
    starting_code: '',
    test_cases: '[]',
  });
  const [currentConstraint, setCurrentConstraint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleAddConstraint = () => {
    if (currentConstraint.trim() && !formData.constraints.includes(currentConstraint.trim())) {
      setFormData(prev => ({ ...prev, constraints: [...prev.constraints, currentConstraint.trim()] }));
      setCurrentConstraint('');
    }
  };

  const handleRemoveConstraint = (constraintToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      constraints: prev.constraints.filter(c => c !== constraintToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.title || !formData.description || !formData.starting_code) {
      setError('Please fill in all required fields: Title, Description, and Starting Code.');
      return;
    }

    let parsedExamples;
    try {
      parsedExamples = JSON.parse(formData.examples);
      if (!Array.isArray(parsedExamples)) throw new Error('Examples must be a JSON array.');
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : 'Invalid JSON format.';
      setError(`Invalid JSON for Examples. Use array format: [{"input": "value", "output": "value"}]. Details: ${message}`);
      return;
    }

    let parsedTestCases;
    try {
      parsedTestCases = JSON.parse(formData.test_cases);
      if (!Array.isArray(parsedTestCases)) throw new Error('Test Cases must be a JSON array.');
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : 'Invalid JSON format.';
      setError(`Invalid JSON for Test Cases. Use array format: [{"input": "value", "expected_output": "value"}]. Details: ${message}`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty,
      examples: parsedExamples,
      constraints: formData.constraints,
      starting_code: formData.starting_code,
      test_cases: parsedTestCases
    };

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Server error: ${response.status}`);
      if (result.success) {
        setSuccessMessage('Question added successfully!');
        setFormData({
          id: '', title: '', description: '', difficulty: '',
          examples: '[]', constraints: [], starting_code: '',
          test_cases: '[]',
        });
        onQuestionAdded();
      } else {
        setError(result.error || 'Failed to add question.');
      }
    } catch (fetchError: unknown) {
      const message = fetchError instanceof Error ? fetchError.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button onClick={onClose} className={styles.closeButton}>&times;</button>
        <h2>Add New Coding Question</h2>
        {error && <p className={styles.errorMessage}>{error}</p>}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Title:<span className={styles.requiredStar}>*</span>
            <input type="text" name="title" value={formData.title} onChange={handleInputChange} required className={styles.input} />
          </label>
          <label className={styles.label}>
            Description:<span className={styles.requiredStar}>*</span>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} required className={styles.textarea}></textarea>
          </label>
          <label className={styles.label}>
            Starting Code:<span className={styles.requiredStar}>*</span>
            <textarea name="starting_code" value={formData.starting_code} onChange={handleInputChange} rows={4} required className={styles.textarea}></textarea>
          </label>
          <label className={styles.label}>
            Difficulty:
            <select name="difficulty" value={formData.difficulty} onChange={handleInputChange} className={styles.select}>
                <option value="">Select Difficulty (Optional)</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
            </select>
          </label>
          <label className={styles.label}>
            Examples (JSON array):
            <textarea name="examples" value={formData.examples} onChange={handleInputChange} rows={3} className={styles.textarea} placeholder='[{"input": "value", "output": "value"}]'/>
          </label>
          <div className={styles.label}>
            Constraints:
            <div className={styles.constraintInputContainer}>
              <input type="text" value={currentConstraint} onChange={(e) => setCurrentConstraint(e.target.value)} placeholder="Enter a constraint" className={styles.input}/>
              <button type="button" onClick={handleAddConstraint} className={styles.addButtonSmall}>Add</button>
            </div>
            <ul className={styles.constraintList}>
              {formData.constraints.map((c, i) => (
                <li key={i} className={styles.constraintItem}>
                  {c} <button type="button" onClick={() => handleRemoveConstraint(c)} className={styles.removeButtonSmall}>&times;</button>
                </li>
              ))}
            </ul>
          </div>
          <label className={styles.label}>
            Test Cases (JSON array):
            <textarea name="test_cases" value={formData.test_cases} onChange={handleInputChange} rows={3} className={styles.textarea} placeholder='[{"input": "value", "expected_output": "value"}]'/>
          </label>
          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
            {isSubmitting ? 'Submitting...' : 'Add Question'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddQuestionForm;
