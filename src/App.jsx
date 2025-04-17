
import React, { useState } from 'react';

function App() {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setAnalysis('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('https://ccontract-review-backend.onrender.com/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.error) {
        setAnalysis('⚠️ ' + data.error);
      } else {
        setAnalysis(data.analysis || data.raw || 'No suggestions returned.');
      }
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      setAnalysis('Error analyzing file.');
    }
    setLoading(false);
  };

  const handleDownloadDocx = async () => {
    const matches = [...analysis.matchAll(/📘 Clause: (.*?)\n❌ Original:\n(.*?)\n⚠️ Issue:\n(.*?)\n✅ Redline Suggestion:\n(.*?)\n---/gs)];
    const suggestions = matches.map(match => ({
      clause: match[1].trim(),
      original: match[2].trim(),
      issue: match[3].trim(),
      suggestion: match[4].trim()
    }));
    if (suggestions.length === 0) {
      alert('No valid suggestions to export.');
      return;
    }
    try {
      const response = await fetch('https://contract-docx-export.onrender.com/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions })
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'AI_Contract_Redlines.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download the Word document.');
    }
  };

  return (
    <div className="container">
      <h1>📝 Contract Companion</h1>
      <p>Upload a contract and let your AI companion highlight redlines to protect your small business.</p>

      <div className="hero-container">
        <img src="/notepad.png" alt="Notepad" className="hero" />
        <img src="/ChatGPT Image Apr 17, 2025, 02_16_11 PM.png" alt="Robot" className="hero" />
      </div>

      <div className="upload-section">
        <input
          type="file"
          id="fileInput"
          accept=".pdf,.doc,.docx"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <label htmlFor="fileInput" className="upload-button">
          📄 Upload Contract for Review
        </label>
      </div>

      {loading && <p className="spinner">🔄 Analyzing your contract…</p>}
      <button onClick={handleDownloadDocx} disabled={!analysis || loading}>
        📥 Download Redlines as Word Doc
      </button>

      <div style={{ marginTop: '2rem' }}>
        {analysis.split('---').map((section, i) =>
          section.includes('📘') ? (
            <div className="card" key={i}>
              {section.split('\n').map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export default App;
