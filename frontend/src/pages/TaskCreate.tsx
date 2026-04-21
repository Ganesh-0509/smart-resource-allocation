import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

import { createTask } from "../api/tasks";
import type { TaskCreate, TaskNeedType, VolunteerSkill } from "../types";

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

const districtList = Object.keys(districtCoordinates).sort((a, b) => a.localeCompare(b));
const defaultDistrict = "Madurai";
const defaultCoordinates = districtCoordinates[defaultDistrict];

type ManualTaskFormState = {
  title: string;
  need_type: TaskNeedType;
  description: string;
  urgency_score: number;
  ward: string;
  district: string;
  household_count: number;
  required_skills: VolunteerSkill[];
  lat: number;
  lng: number;
};

export default function TaskCreate() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<ManualTaskFormState>({
    title: "",
    need_type: "other",
    description: "",
    urgency_score: 60,
    ward: "",
    district: defaultDistrict,
    household_count: 1,
    required_skills: [],
    lat: defaultCoordinates.lat,
    lng: defaultCoordinates.lng,
  });
  const [geoLoading, setGeoLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const createTaskMutation = useMutation({
    mutationFn: (payload: TaskCreate) => createTask(payload),
    onSuccess: () => {
      toast.success("Task created successfully.");
      navigate("/coordinator", { replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create task.");
    },
  });

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

  function applyDistrictCenter(district: string) {
    const center = districtCoordinates[district];
    if (!center) {
      setLocationMessage("District center not found. Please enter coordinates manually.");
      return;
    }

    setFormState((current) => ({
      ...current,
      district,
      lat: center.lat,
      lng: center.lng,
    }));
    setLocationMessage("Applied district center coordinates.");
  }

  function useMyLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not supported in this browser.");
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
        setLocationMessage("Current location captured.");
        setGeoLoading(false);
      },
      (error) => {
        setLocationMessage(error.message || "Unable to fetch location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    if (!formState.ward.trim()) {
      toast.error("Ward is required.");
      return;
    }

    const payload: TaskCreate = {
      title: formState.title.trim(),
      need_type: formState.need_type,
      description: formState.description.trim(),
      urgency_score: Math.max(0, Math.min(100, formState.urgency_score)),
      ward: formState.ward.trim(),
      district: formState.district.trim() || defaultDistrict,
      lat: formState.lat,
      lng: formState.lng,
      required_skills: formState.required_skills,
      household_count: Math.max(1, formState.household_count),
      source: "manual",
    };

    createTaskMutation.mutate(payload);
  }

  return (
    <div className="space-y-5">
      <Toaster position="top-right" toastOptions={{ duration: 2400 }} />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Manual Task</h1>
          <p className="mt-2 text-slate-600">
            Add verified community needs directly when OCR or survey intake is unavailable.
          </p>
        </div>
        <Link
          to="/survey/upload"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Or upload survey
        </Link>
      </header>

      <form onSubmit={submitForm} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            type="text"
            value={formState.title}
            onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
            placeholder="e.g. Water tankers needed in Ward 12"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Need Type</label>
            <select
              value={formState.need_type}
              onChange={(event) =>
                setFormState((current) => ({ ...current, need_type: event.target.value as TaskNeedType }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
            >
              {needTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
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
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ward</label>
            <input
              type="text"
              value={formState.ward}
              onChange={(event) => setFormState((current) => ({ ...current, ward: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
              placeholder="e.g. Ward 12"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">District</label>
            <select
              value={formState.district}
              onChange={(event) => applyDistrictCenter(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
            >
              {districtList.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">Task Location</p>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={geoLoading}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {geoLoading ? "Locating..." : "Use my location"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Latitude</label>
              <input
                type="number"
                step="any"
                value={formState.lat}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, lat: Number(event.target.value) || 0 }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Longitude</label>
              <input
                type="number"
                step="any"
                value={formState.lng}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, lng: Number(event.target.value) || 0 }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
              />
            </div>
          </div>

          {locationMessage && <p className="mt-2 text-xs text-slate-600">{locationMessage}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Households Affected</label>
          <input
            type="number"
            min={1}
            value={formState.household_count}
            onChange={(event) =>
              setFormState((current) => ({ ...current, household_count: Number(event.target.value) || 1 }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Required Skills</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {skillOptions.map((skill) => {
              const selected = formState.required_skills.includes(skill.value);
              return (
                <button
                  key={skill.value}
                  type="button"
                  onClick={() => toggleSkill(skill.value)}
                  className={[
                    "rounded-md border px-3 py-2 text-xs font-medium transition",
                    selected
                      ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {skill.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            rows={4}
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
            placeholder="Additional verified context from field team"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={createTaskMutation.isPending}
            className="rounded-md bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177f5e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/coordinator")}
            className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
