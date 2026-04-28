import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { scanSurvey } from "../services/ocr";
import type { OCRScanResult } from "../services/ocr";
import { createIntakeReport } from "../services/intake";
import type { IntakeReportCreate, TaskNeedType, VolunteerSkill } from "../types";
import { skillOptions, districtCoordinates } from "../utils/constants";
import { toast, Toaster } from "react-hot-toast";

type Step = 1 | 2 | 3;

type SurveyFormState = {
  title: string;
  need_type: TaskNeedType;
  urgency: "low" | "medium" | "high";
  ward: string;
  district: string;
  household_count: number;
  required_skills: VolunteerSkill[];
  description: string;
  lat: number | null;
  lng: number | null;
};

const defaultSurveyCoordinates = districtCoordinates.Chennai;



function resolveCoordinates(lat: number | null, lng: number | null, district: string): { lat: number; lng: number } {
  if (lat !== null && lng !== null && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) {
    return { lat, lng };
  }
  return districtCoordinates[district.trim()] || defaultSurveyCoordinates;
}

function toTaskNeedType(value?: string): TaskNeedType {
  const valid = ["nutrition", "medical", "shelter", "education", "water", "livelihood"];
  if (valid.includes(value || "")) return value as TaskNeedType;
  return "other";
}

function toSkillList(values?: string[]): VolunteerSkill[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(skillOptions.map((item) => item.value));
  return values.filter((value): value is VolunteerSkill => allowed.has(value as VolunteerSkill));
}

function confidenceMeta(score: number) {
  if (score >= 0.8) return { label: "High confidence", className: "bg-emerald-100 text-emerald-800" };
  if (score >= 0.65) return { label: "Medium confidence", className: "bg-amber-100 text-amber-800" };
  return { label: "Low confidence", className: "bg-red-100 text-red-700" };
}

export default function SurveyUpload() {
  const [step, setStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);
  
  const [formState, setFormState] = useState<SurveyFormState>({
    title: "",
    need_type: "other",
    urgency: "medium",
    ward: "",
    district: "Chennai",
    household_count: 1,
    required_skills: [],
    description: "",
    lat: defaultSurveyCoordinates.lat,
    lng: defaultSurveyCoordinates.lng,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const scanMutation = useMutation({
    mutationFn: (file: File) => scanSurvey(file),
    onSuccess: (result) => {
      setScanResult(result);
      setFormState({
        title: result.title || "",
        need_type: toTaskNeedType(result.need_type),
        urgency: result.urgency,
        ward: result.ward || "",
        district: result.district || "Chennai",
        household_count: Math.max(1, Number(result.household_count || 1)),
        required_skills: toSkillList(result.required_skills),
        description: result.description || "",
        lat: result.lat,
        lng: result.lng,
      });
      setStep(2);
    },
    onError: () => {
      toast.error("Failed to process survey scan.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (report: IntakeReportCreate) => createIntakeReport(report),
    onSuccess: () => {
      setStep(3);
    },
    onError: () => {
      toast.error("Failed to submit report for review.");
    },
  });

  function handleFileSelect(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setSelectedFile(file);
    setStep(1);
  }

  function handleConfirmSubmit() {
    const coords = resolveCoordinates(formState.lat, formState.lng, formState.district);
    const payload: IntakeReportCreate = {
      title: formState.title,
      description: formState.description,
      source: "ocr",
      urgency: formState.urgency,
      location_text: formState.ward,
      lat: coords.lat,
      lng: coords.lng,
      image_url: scanResult?.image_url,
      raw_data: {
        need_type: formState.need_type,
        district: formState.district,
        household_count: formState.household_count,
        required_skills: formState.required_skills,
        confidence_score: scanResult?.confidence_score,
      }
    };
    submitMutation.mutate(payload);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8 px-4 font-inter">
      <Toaster position="top-right" />
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF4EE] text-[#1A3C2E] text-[10px] font-black uppercase tracking-widest mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E8712A] animate-pulse"></div>
          Vision AI Engine
        </div>
        <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Survey Digitize</h1>
        <p className="mt-2 text-slate-500 font-medium">
          Upload handwritten surveys to the triage system. Verified needs go to coordinators for official approval.
        </p>
      </header>

      {/* Step Progress */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-3">
            <span className={`h-10 w-10 flex items-center justify-center rounded-xl text-sm font-black transition-all ${
              step >= s ? "bg-[#1A3C2E] text-white shadow-lg" : "bg-slate-50 text-slate-300"
            }`}>
              {s}
            </span>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step {s}</p>
              <p className={`text-xs font-bold ${step === s ? 'text-[#1A3C2E]' : 'text-slate-500'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Verify' : 'Success'}
              </p>
            </div>
            {s < 3 && <div className="flex-1 h-px border-t-2 border-dashed border-slate-100 mx-4" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-100 rounded-[2rem] p-16 cursor-pointer hover:bg-slate-50 transition-all group"
            >
              <div className="w-16 h-16 bg-white shadow-xl rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-[#1A3C2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-lg font-bold text-slate-700">Drop survey image or click to browse</p>
              <p className="text-sm text-slate-400 mt-1">High-resolution scans work best for OCR</p>
            </div>
            
            {previewUrl && <img src={previewUrl} className="mt-8 mx-auto max-h-64 rounded-2xl border shadow-sm" />}
            
            <button
              onClick={() => scanMutation.mutate(selectedFile!)}
              disabled={!selectedFile || scanMutation.isPending}
              className="mt-8 w-full py-4 bg-[#1A3C2E] text-white rounded-2xl font-black shadow-xl shadow-[#1A3C2E]/20 hover:bg-[#2D5E47] transition-all disabled:opacity-50"
            >
              {scanMutation.isPending ? "Analyzing with Vision AI..." : "Process Scan →"}
            </button>
        </div>
      )}

      {step === 2 && scanResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-6 border border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Original Scan</p>
            <img src={scanResult.image_url} className="w-full rounded-2xl border" />
            <div className={`mt-4 p-3 rounded-xl flex items-center justify-between ${confidenceMeta(scanResult.confidence_score).className}`}>
              <span className="text-xs font-bold">{confidenceMeta(scanResult.confidence_score).label}</span>
              <span className="text-xs font-black">{Math.round(scanResult.confidence_score * 100)}%</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Title</label>
              <input value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 ring-[#1A3C2E]/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Urgency</label>
                <select value={formState.urgency} onChange={e => setFormState({...formState, urgency: e.target.value as any})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold border-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">District</label>
                <input value={formState.district} readOnly className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold border-none text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
              <textarea value={formState.description} rows={4} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold border-none" />
            </div>

            <button
              onClick={handleConfirmSubmit}
              disabled={submitMutation.isPending}
              className="w-full py-4 bg-[#E8712A] text-white rounded-2xl font-black shadow-xl shadow-[#E8712A]/20 hover:bg-[#D16223] transition-all"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit to Triage Queue"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 text-center shadow-xl">
          <div className="w-20 h-20 bg-[#EAF4EE] text-[#1D9E75] rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-black text-[#1A3C2E] font-['Instrument_Serif'] mb-4">Report Submitted!</h2>
          <p className="text-slate-500 max-w-xs mx-auto mb-10 font-medium">Your digitized survey has been sent to the Triage Queue for coordinator approval.</p>
          <div className="flex flex-col gap-4">
            <button onClick={() => setStep(1)} className="w-full py-4 bg-[#1A3C2E] text-white rounded-2xl font-black shadow-lg">Scan Another Survey</button>
            <Link to="/ngo/dashboard" className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold">Go to Dashboard</Link>
          </div>
        </div>
      )}
    </div>
  );
}
