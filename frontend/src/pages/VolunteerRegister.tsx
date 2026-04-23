import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { registerVolunteer } from "../api/volunteers";
import type { Volunteer, VolunteerCreate, VolunteerSkill } from "../types";

const skillOptions: Array<{ label: string; value: VolunteerSkill }> = [
  { label: "Nutrition", value: "nutrition" },
  { label: "Medical", value: "medical" },
  { label: "Education", value: "education" },
  { label: "Logistics", value: "logistics" },
  { label: "Counselling", value: "counselling" },
  { label: "Construction", value: "construction" },
  { label: "Water & Sanitation", value: "water_sanitation" },
  { label: "Livelihood", value: "livelihood" },
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

const districtList = Object.keys(districtCoordinates);

const volunteerFormSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^\+91[6-9]\d{9}$/, "Use valid Indian format: +91XXXXXXXXXX"),
    skills: z.array(z.enum(skillOptions.map((item) => item.value) as [VolunteerSkill, ...VolunteerSkill[]])).min(1, "Select at least one skill"),
    locationMode: z.enum(["geolocation", "manual"]),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    ward: z.string(),
    district: z.string(),
    availability: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.locationMode === "geolocation") {
      if (values.lat === null || values.lng === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lat"],
          message: "Use your location to continue",
        });
      }
    }

    if (values.locationMode === "manual") {
      if (!values.ward.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ward"],
          message: "Ward name is required for manual location",
        });
      }
      if (!values.district.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["district"],
          message: "Select a district",
        });
      }
    }
  });

type VolunteerFormValues = z.infer<typeof volunteerFormSchema>;

export default function VolunteerRegister() {
  const navigate = useNavigate();
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [registeredVolunteer, setRegisteredVolunteer] = useState<Volunteer | null>(null);

  const {
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerFormValues>({
    resolver: zodResolver(volunteerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      skills: [],
      locationMode: "manual",
      lat: null,
      lng: null,
      ward: "",
      district: "",
      availability: true,
    },
  });

  const selectedSkills = watch("skills");
  const locationMode = watch("locationMode");
  const lat = watch("lat");
  const lng = watch("lng");

  function toggleSkill(skill: VolunteerSkill) {
    const currentSkills = selectedSkills || [];
    const nextSkills = currentSkills.includes(skill)
      ? currentSkills.filter((item) => item !== skill)
      : [...currentSkills, skill];

    setValue("skills", nextSkills, { shouldValidate: true });
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
        setValue("locationMode", "geolocation", { shouldValidate: true });
        setValue("lat", position.coords.latitude, { shouldValidate: true });
        setValue("lng", position.coords.longitude, { shouldValidate: true });
        setGeoMessage("Location captured successfully.");
        setGeoLoading(false);
        void trigger(["lat", "lng"]);
      },
      (error) => {
        setGeoLoading(false);
        setGeoMessage(error.message || "Unable to fetch location.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function onSubmit(values: VolunteerFormValues) {
    setSubmitError("");

    let coordinates: { lat: number; lng: number } | null = null;

    if (values.locationMode === "geolocation") {
      if (values.lat !== null && values.lng !== null) {
        coordinates = { lat: values.lat, lng: values.lng };
      }
    } else {
      const districtCenter = districtCoordinates[values.district];
      if (districtCenter) {
        coordinates = districtCenter;
      }
    }

    if (!coordinates) {
      setSubmitError("Unable to resolve location. Please use geolocation or choose valid manual location.");
      return;
    }

    const payload: VolunteerCreate = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      skills: values.skills,
      lat: coordinates.lat,
      lng: coordinates.lng,
      availability: values.availability,
    };

    try {
      const response = await registerVolunteer(payload);
      localStorage.setItem("namma_volunteer_id", response.id);
      localStorage.setItem("volunteer_id", response.id);
      localStorage.setItem("volunteerId", response.id);
      localStorage.setItem("role", "volunteer");
      setRegisteredVolunteer(response);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Registration failed. Please try again.");
    }
  }

  if (registeredVolunteer) {
    return (
      <section className="mx-auto max-w-2xl rounded-[2rem] bg-white p-12 text-center shadow-[0_40px_100px_rgba(26,60,46,0.06)] border border-[#114B3B]/5">
        <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Welcome to Namma Connect!</h1>
        <p className="mt-4 text-slate-500 font-medium">
          You&apos;ll receive an SMS when a task matches your skills.
        </p>
        <button
          type="button"
          onClick={() => navigate("/volunteer/dashboard")}
          className="mt-10 inline-flex items-center justify-center rounded-2xl bg-[#1A3C2E] px-8 py-4 text-base font-bold text-white shadow-xl shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] hover:-translate-y-1 active:scale-95"
        >
          Enter Volunteer Dashboard →
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 shadow-[0_40px_100px_rgba(26,60,46,0.06)] border border-[#114B3B]/5 sm:p-12">
      <h1 className="text-4xl font-black text-[#1A3C2E] font-['Instrument_Serif'] tracking-tight">Volunteer Registration</h1>
      <p className="mt-2 text-slate-500 font-medium">
        Join Bharat&apos;s digital response network and help communities faster.
      </p>

      <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-[#1A3C2E] font-medium"
            placeholder="Enter your full name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
            Phone number
          </label>
          <input
            id="phone"
            type="text"
            {...register("phone")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#1D9E75]"
            placeholder="+919876543210"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Skills (select at least 1)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {skillOptions.map((skill) => {
              const checked = selectedSkills?.includes(skill.value) || false;
              return (
                <button
                  key={skill.value}
                  type="button"
                  onClick={() => toggleSkill(skill.value)}
                  className={[
                    "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                    checked
                      ? "bg-[#E8712A] text-white shadow-lg shadow-[#E8712A]/20"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {skill.label}
                </button>
              );
            })}
          </div>
          {errors.skills && <p className="mt-1 text-xs text-red-600">{errors.skills.message}</p>}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Current location</p>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
              <input type="radio" value="geolocation" {...register("locationMode")} className="accent-[#1D9E75]" />
              Use my location
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
              <input type="radio" value="manual" {...register("locationMode")} className="accent-[#1D9E75]" />
              Enter manually
            </label>
          </div>

          {locationMode === "geolocation" && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                className="inline-flex items-center rounded-xl bg-[#1A3C2E] px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] disabled:opacity-60"
              >
                {geoLoading ? "Capturing..." : "Use my location"}
              </button>
              {lat !== null && lng !== null && (
                <p className="mt-2 text-xs text-slate-600">
                  Captured: {lat.toFixed(4)}, {lng.toFixed(4)}
                </p>
              )}
              {geoMessage && <p className="mt-2 text-xs text-slate-600">{geoMessage}</p>}
              {errors.lat && <p className="mt-1 text-xs text-red-600">{errors.lat.message}</p>}
            </div>
          )}

          {locationMode === "manual" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ward" className="mb-1 block text-sm font-medium text-slate-700">
                  Ward name
                </label>
                <input
                  id="ward"
                  type="text"
                  {...register("ward")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-[#1A3C2E] font-medium"
                  placeholder="e.g. Ward 12"
                />
                {errors.ward && <p className="mt-1 text-xs text-red-600">{errors.ward.message}</p>}
              </div>
              <div>
                <label htmlFor="district" className="mb-1 block text-sm font-medium text-slate-700">
                  District (Tamil Nadu)
                </label>
                <select
                  id="district"
                  {...register("district")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-[#1A3C2E] font-bold"
                >
                  <option value="">Select district</option>
                  {districtList.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                {errors.district && <p className="mt-1 text-xs text-red-600">{errors.district.message}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-slate-800">Available to help right now</p>
            <p className="text-xs text-slate-500">You can change this later from your dashboard.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center">
            <input type="checkbox" {...register("availability")} className="h-4 w-4 accent-[#1D9E75]" />
          </label>
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1A3C2E] px-8 py-4 text-base font-bold text-white shadow-xl shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] hover:-translate-y-1 active:scale-95 disabled:opacity-70"
        >
          {isSubmitting ? "Processing..." : "Complete Registration →"}
        </button>
      </form>
    </section>
  );
}
