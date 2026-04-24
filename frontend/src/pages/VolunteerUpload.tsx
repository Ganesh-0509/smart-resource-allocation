import React, { useState } from 'react';

const VolunteerUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ inserted: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_URL}/api/volunteers/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,phone,skills,ward,district\nJohn Doe,+919876543210,\"medical,logistics\",Ward 5,Chennai\nJane Smith,+919876543211,\"education\",Ward 12,Madurai";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'volunteer_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bulk Volunteer Upload</h1>
          <p className="mt-2 text-slate-500">Import your volunteer database via CSV</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download CSV Template
        </button>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="max-w-xl">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
            Select CSV File
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#EAF4EE] file:text-[#1A3C2E] hover:file:bg-[#D1E7D9] transition-all cursor-pointer"
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="rounded-full bg-[#1A3C2E] px-8 py-2.5 text-sm font-bold text-white shadow-xl shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Start Upload'}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-red-500 font-medium">{error}</p>}
        </div>
      </div>

      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6">
              <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Successfully Inserted</p>
              <p className="mt-2 text-4xl font-black text-emerald-900">{results.inserted}</p>
            </div>
            <div className="rounded-2xl bg-red-50 border border-red-100 p-6">
              <p className="text-sm font-bold text-red-600 uppercase tracking-widest">Failed Rows</p>
              <p className="mt-2 text-4xl font-black text-red-900">{results.failed}</p>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Error Log</h3>
              </div>
              <div className="max-h-60 overflow-y-auto px-6 py-4">
                <ul className="space-y-2">
                  {results.errors.map((err, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VolunteerUpload;
