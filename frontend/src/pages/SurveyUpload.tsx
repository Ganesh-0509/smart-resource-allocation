import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { confirmSurvey, uploadSurvey } from "../api/ocr";
import type { OCRResult, Task, TaskCreate, TaskNeedType, VolunteerSkill } from "../types";

type Step = 1 | 2 | 3;

type SurveyFormState = {
  title: string;
  need_type: TaskNeedType;
  urgency_score: number;
  ward: string;
  district: string;
  household_count: number;
  required_skills: VolunteerSkill[];
  description: string;
  lat: number | null;
  lng: number | null;
};

const skillOptions: Array<{ value: VolunteerSkill; label: string }> = [
  { value: "nutrition", label: "Nutrition" },
  { value: "medical", label: "Medical" },
  { value: "education", label: "Education" },
  { value: "logistics", label: "Logistics" },
  { value: "counselling", label: "Counselling" },
  { value: "construction", label: "Construction" },
  { value: "water_sanitation", label: "Water & Sanitation" },
  { value: "livelihood", label: "Livelihood" },
];

const needTypeOptions: Array<{ value: TaskNeedType; label: string }> = [
  { value: "nutrition", label: "Nutrition" },
  { value: "medical", label: "Medical" },
  { value: "shelter", label: "Shelter" },
  { value: "education", label: "Education" },
  { value: "water", label: "Water" },
  { value: "livelihood", label: "Livelihood" },
  { value: "other", label: "Other" },
];

const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  Ariyalur: { lat: 11.1398, lng: 79.0756 },
  Chengalpattu: { lat: 12.6819, lng: 79.9888 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Cuddalore: { lat: 11.7447, lng: 79.768 },
  Dharmapuri: { lat: 12.1277, lng: 78.1579 },
  Dindigul: { lat: 10.3673, lng: 77.9803 },
  Erode: { lat: 11.341, lng: 77.7172 },
  Kallakurichi: { lat: 11.739, lng: 78.9637 },
  Kanchipuram: { lat: 12.8342, lng: 79.7036 },
  Kanyakumari: { lat: 8.0883, lng: 77.5385 },
  Karur: { lat: 10.9601, lng: 78.0766 },
  Krishnagiri: { lat: 12.5266, lng: 78.2137 },
  Madurai: { lat: 9.9252, lng: 78.1198 },
  Mayiladuthurai: { lat: 11.1035, lng: 79.655 },
  Nagapattinam: { lat: 10.7656, lng: 79.8428 },
  Namakkal: { lat: 11.2189, lng: 78.1674 },
  Nilgiris: { lat: 11.4064, lng: 76.6932 },
  Perambalur: { lat: 11.2333, lng: 78.8833 },
  Pudukkottai: { lat: 10.3833, lng: 78.8 },
  Ramanathapuram: { lat: 9.3639, lng: 78.8395 },
  Ranipet: { lat: 12.9273, lng: 79.3335 },
  Salem: { lat: 11.6643, lng: 78.146 },
  Sivaganga: { lat: 9.847, lng: 78.4836 },
  Tenkasi: { lat: 8.9592, lng: 77.3152 },
  Thanjavur: { lat: 10.7867, lng: 79.1378 },
  Theni: { lat: 10.0104, lng: 77.4768 },
  Thoothukudi: { lat: 8.7642, lng: 78.1348 },
  Tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  Tirunelveli: { lat: 8.7139, lng: 77.7567 },
  Tirupattur: { lat: 12.495, lng: 78.568 },
  Tiruppur: { lat: 11.1085, lng: 77.3411 },
  Tiruvallur: { lat: 13.1439, lng: 79.9089 },
  Tiruvannamalai: { lat: 12.2253, lng: 79.0747 },
  Tiruvarur: { lat: 10.7713, lng: 79.6368 },
  Vellore: { lat: 12.9165, lng: 79.1325 },
  Viluppuram: { lat: 11.939, lng: 79.4861 },
  Virudhunagar: { lat: 9.5841, lng: 77.9579 },
};

const defaultSurveyCoordinates = districtCoordinates.Madurai;

function parseOptionalNumber(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveCoordinates(lat: number | null, lng: number | null, district: string): { lat: number; lng: number } {
  const hasManualCoordinates =
    lat !== null && lng !== null && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001);

  if (hasManualCoordinates) {
    return { lat, lng };
  }

  const districtCenter = districtCoordinates[district.trim()];
  if (districtCenter) {
    return districtCenter;
  }

  return defaultSurveyCoordinates;
}

function toTaskNeedType(value?: string): TaskNeedType {
  if (
    value === "nutrition" ||
    value === "medical" ||
    value === "shelter" ||
    value === "education" ||
    value === "water" ||
    value === "livelihood"
  ) {
    return value;
  }
  return "other";
}

function toSkillList(values?: string[]): VolunteerSkill[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const allowed = new Set(skillOptions.map((item) => item.value));
  return values.filter((value): value is VolunteerSkill => allowed.has(value as VolunteerSkill));
}

function confidenceMeta(score: number): { label: string; className: string } {
  if (score >= 80) {
    return {
      label: "High confidence",
      className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    };
  }

  if (score >= 65) {
    return {
      label: "Medium confidence",
      className: "bg-amber-100 text-amber-800 border border-amber-200",
    };
  }

  return {
    label: "Low confidence",
    className: "bg-red-100 text-red-700 border border-red-200",
  };
}

function confidenceDotClass(score: number): string {
  if (score > 75) {
    return "bg-emerald-500";
  }

  if (score >= 50) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

function FieldLabel({ label, confidence }: { label: string; confidence: number }) {
  return (
    <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
      <span className={["inline-flex h-2.5 w-2.5 rounded-full", confidenceDotClass(confidence)].join(" ")} />
      {label}
    </label>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function CheckmarkAnimation() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm animate-pulse">
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.2 4.2L19 7" />
      </svg>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { id: 1, title: "Step 1", subtitle: "Upload" },
    { id: 2, title: "Step 2", subtitle: "Review" },
    { id: 3, title: "Step 3", subtitle: "Success" },
  ] as const;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {steps.map((item, index) => {
          const isComplete = step > item.id;
          const isCurrent = step === item.id;

          return (
            <div key={item.id} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                    isComplete || isCurrent
                      ? "bg-[#1D9E75] text-white"
                      : "bg-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  {item.id}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.subtitle}</p>
                </div>
              </div>
              {index < steps.length - 1 ? <span className="hidden flex-1 border-t border-slate-300 sm:block" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SurveyUpload() {
  const [step, setStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadResult, setUploadResult] = useState<OCRResult | null>(null);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  const [formState, setFormState] = useState<SurveyFormState>({
    title: "",
    need_type: "other",
    urgency_score: 50,
    ward: "",
    district: "Madurai",
    household_count: 1,
    required_skills: [],
    description: "",
    lat: defaultSurveyCoordinates.lat,
    lng: defaultSurveyCoordinates.lng,
  });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const processMutation = useMutation({
    mutationFn: (file: File) => uploadSurvey(file),
    onSuccess: (result) => {
      setUploadResult(result);
      setFormState({
        title: result.title || "",
        need_type: toTaskNeedType(result.need_type),
        urgency_score: Math.max(0, Math.min(100, Number(result.urgency_score || 50))),
        ward: result.ward || "",
        district: result.district || "Madurai",
        household_count: Math.max(1, Number(result.household_count || 1)),
        required_skills: toSkillList(result.required_skills),
        description: result.summary || "",
        lat: Number.isFinite(result.lat) ? Number(result.lat) : null,
        lng: Number.isFinite(result.lng) ? Number(result.lng) : null,
      });
      setErrorMessage("");
      setGeoMessage("");
      setStep(2);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to process image.");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: ({ uploadId, taskData }: { uploadId: string; taskData: TaskCreate }) =>
      confirmSurvey(uploadId, taskData),
    onSuccess: (task) => {
      setCreatedTask(task);
      setErrorMessage("");
      setStep(3);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create task from survey.");
    },
  });

  const lowConfidence = (uploadResult?.confidence_score || 0) < 65;
  const confidence = uploadResult?.confidence_score || 0;
  const confidenceStyle = confidenceMeta(confidence);

  const fieldClassName = useMemo(() => {
    return [
      "w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition",
      lowConfidence
        ? "border-amber-400 focus:border-amber-500"
        : "border-slate-300 focus:border-[#1D9E75]",
    ].join(" ");
  }, [lowConfidence]);

  function handleFileSelect(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload a valid image file.");
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setCreatedTask(null);
    setErrorMessage("");
    setStep(1);
  }

  function resetFlow() {
    setStep(1);
    setSelectedFile(null);
    setUploadResult(null);
    setCreatedTask(null);
    setErrorMessage("");
    setFormState({
      title: "",
      need_type: "other",
      urgency_score: 50,
      ward: "",
      district: "Madurai",
      household_count: 1,
      required_skills: [],
      description: "",
      lat: defaultSurveyCoordinates.lat,
      lng: defaultSurveyCoordinates.lng,
    });
    setGeoMessage("");
  }

  function toggleSkill(skill: VolunteerSkill) {
    setFormState((current) => {
      const exists = current.required_skills.includes(skill);
      return {
        ...current,
        required_skills: exists
          ? current.required_skills.filter((item) => item !== skill)
          : [...current.required_skills, skill],
      };
    });
  }

  function startProcessing() {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");
      return;
    }

    setErrorMessage("");
    processMutation.mutate(selectedFile);
  }

  function handleUseMyLocation() {
    setGeoMessage("");

    if (!navigator.geolocation) {
      setGeoMessage("Geolocation is not supported in this browser.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormState((current) => ({
          ...current,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }));
        setGeoMessage("Current location captured.");
        setGeoLoading(false);
      },
      (error) => {
        setGeoMessage(error.message || "Unable to fetch location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function applyDistrictCenter() {
    const districtCenter = districtCoordinates[formState.district.trim()];
    if (!districtCenter) {
      setGeoMessage("District not recognized. Using default fallback during save.");
      return;
    }

    setFormState((current) => ({
      ...current,
      lat: districtCenter.lat,
      lng: districtCenter.lng,
    }));
    setGeoMessage("Applied district center coordinates.");
  }

  function handleConfirmSave() {
    if (!uploadResult) {
      setErrorMessage("Survey upload details are missing. Please process again.");
      return;
    }

    if (!formState.title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    const resolvedCoordinates = resolveCoordinates(formState.lat, formState.lng, formState.district);

    const payload: TaskCreate = {
      title: formState.title.trim(),
      need_type: formState.need_type,
      description: formState.description.trim(),
      urgency_score: Math.max(0, Math.min(100, formState.urgency_score)),
      ward: formState.ward.trim(),
      district: formState.district.trim() || "Madurai",
      lat: resolvedCoordinates.lat,
      lng: resolvedCoordinates.lng,
      required_skills: formState.required_skills,
      household_count: Math.max(1, formState.household_count),
      source: "survey",
    };

    confirmMutation.mutate({ uploadId: uploadResult.upload_id, taskData: payload });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Survey Upload</h1>
        <p className="mt-2 text-slate-600">
          Digitize handwritten community surveys and convert them into actionable tasks.
        </p>
      </header>

      <StepIndicator step={step} />

      {step === 1 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
          />

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFileSelect(event.dataTransfer.files?.[0] || null);
            }}
            className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center"
          >
            <p className="text-sm font-medium text-slate-700">Drop survey image here or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">Take a clear photo of the filled survey for best OCR accuracy</p>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-50"
              >
                Choose Image
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#177f5e]"
              >
                <CameraIcon />
                Take Photo
              </button>
            </div>
          </div>

          {previewUrl && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Preview</p>
              <img src={previewUrl} alt="Survey preview" className="max-h-80 w-full rounded-lg border border-slate-200 object-contain" />
            </div>
          )}

          <div className="mt-5">
            <button
              type="button"
              onClick={startProcessing}
              disabled={!selectedFile || processMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#177f5e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processMutation.isPending ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                  Reading survey... This takes a few seconds
                </>
              ) : (
                "Process Survey"
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>{errorMessage}</p>
              {selectedFile && !processMutation.isPending ? (
                <button
                  type="button"
                  onClick={startProcessing}
                  className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Retry processing
                </button>
              ) : null}
              <p className="mt-2">
                <Link to="/tasks/new" className="font-semibold underline">
                  Open manual task form
                </Link>
              </p>
            </div>
          )}
        </section>
      )}

      {step === 2 && uploadResult && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Review extracted fields</h2>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${confidenceStyle.className}`}>
              {confidenceStyle.label}: {Math.round(confidence)}%
            </span>
          </div>

          {lowConfidence && (
            <p className="text-sm font-medium text-amber-700">Review needed: OCR confidence is low for this survey.</p>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Uploaded image</p>
              <img src={previewUrl} alt="Uploaded survey" className="max-h-[520px] w-full rounded-lg border border-slate-200 object-contain" />
            </div>

            <div className="space-y-4">
              <div>
                  <FieldLabel label="Title" confidence={confidence} />
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                  className={fieldClassName}
                />
              </div>

              <div>
                  <FieldLabel label="Need Type" confidence={confidence} />
                <select
                  value={formState.need_type}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, need_type: toTaskNeedType(event.target.value) }))
                  }
                  className={fieldClassName}
                >
                  {needTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span className={["inline-flex h-2.5 w-2.5 rounded-full", confidenceDotClass(confidence)].join(" ")} />
                  Urgency Score: {formState.urgency_score}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formState.urgency_score}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, urgency_score: Number(event.target.value) }))
                  }
                  className="w-full accent-[#1D9E75]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel label="Ward" confidence={confidence} />
                  <input
                    type="text"
                    value={formState.ward}
                    onChange={(event) => setFormState((current) => ({ ...current, ward: event.target.value }))}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <FieldLabel label="District" confidence={confidence} />
                  <input
                    type="text"
                    value={formState.district}
                    onChange={(event) => setFormState((current) => ({ ...current, district: event.target.value }))}
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">Task Location</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={geoLoading}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      {geoLoading ? "Locating..." : "Use my location"}
                    </button>
                    <button
                      type="button"
                      onClick={applyDistrictCenter}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Use district center
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel label="Latitude" confidence={confidence} />
                    <input
                      type="number"
                      step="any"
                      value={formState.lat ?? ""}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, lat: parseOptionalNumber(event.target.value) }))
                      }
                      className={fieldClassName}
                      placeholder="e.g. 9.9252"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Longitude" confidence={confidence} />
                    <input
                      type="number"
                      step="any"
                      value={formState.lng ?? ""}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, lng: parseOptionalNumber(event.target.value) }))
                      }
                      className={fieldClassName}
                      placeholder="e.g. 78.1198"
                    />
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  If coordinates are empty, the district center will be used automatically.
                </p>
                {geoMessage && <p className="mt-1 text-xs text-slate-600">{geoMessage}</p>}
              </div>

              <div>
                <FieldLabel label="Household Count" confidence={confidence} />
                <input
                  type="number"
                  min={1}
                  value={formState.household_count}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, household_count: Number(event.target.value) || 1 }))
                  }
                  className={fieldClassName}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Required Skills</p>
                <div className="grid grid-cols-2 gap-2">
                  {skillOptions.map((skill) => {
                    const checked = formState.required_skills.includes(skill.value);
                    return (
                      <label
                        key={skill.value}
                        className={[
                          "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium",
                          checked
                            ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]"
                            : lowConfidence
                              ? "border-amber-400 bg-white text-slate-700"
                              : "border-slate-300 bg-white text-slate-700",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSkill(skill.value)}
                          className="h-3.5 w-3.5 accent-[#1D9E75]"
                        />
                        {skill.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel label="Description / Summary" confidence={confidence} />
                <textarea
                  rows={4}
                  value={formState.description}
                  onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                  className={fieldClassName}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={confirmMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#177f5e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmMutation.isPending ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Confirm & Create Task"
              )}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Start Over
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>{errorMessage}</p>
              {!confirmMutation.isPending ? (
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Retry save
                </button>
              ) : null}
            </div>
          )}
        </section>
      )}

      {step === 3 && createdTask && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
          <CheckmarkAnimation />
          <h2 className="mt-4 text-3xl font-bold text-slate-900">Task created successfully!</h2>
          <p className="mt-2 text-slate-700">The survey has been digitized and converted into a task.</p>

          <div className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-200 bg-white p-4 text-left shadow-sm">
            <p className="text-sm text-slate-500">Title</p>
            <p className="font-semibold text-slate-900">{createdTask.title}</p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Need Type</p>
                <p className="capitalize text-slate-800">{createdTask.need_type}</p>
              </div>
              <div>
                <p className="text-slate-500">Urgency</p>
                <p className="text-slate-800">{createdTask.urgency_score}</p>
              </div>
              <div>
                <p className="text-slate-500">Ward</p>
                <p className="text-slate-800">{createdTask.ward || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500">District</p>
                <p className="text-slate-800">{createdTask.district || "Madurai"}</p>
              </div>
              <div>
                <p className="text-slate-500">Households</p>
                <p className="text-slate-800">{createdTask.household_count ?? 1}</p>
              </div>
              <div>
                <p className="text-slate-500">Source</p>
                <p className="capitalize text-slate-800">{createdTask.source || "survey"}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Upload Another Survey
            </button>
            <Link
              to="/coordinator"
              className="rounded-md bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#177f5e]"
            >
              View in Coordinator Dashboard
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
