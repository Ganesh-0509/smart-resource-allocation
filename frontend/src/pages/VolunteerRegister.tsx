
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { registerVolunteer } from "../services/volunteers";
import type { Volunteer, VolunteerCreate, VolunteerSkill } from "../types";
import { skillOptions, districtCoordinates, districtList } from "../utils/constants";
import { notify } from "../utils/notify";
import api from "../services/api";
import { useEffect } from "react";


const volunteerFormSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^\+91[6-9]\d{9}$/, "Use valid Indian format: +91XXXXXXXXXX"),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
    dob: z.string().min(1, "Date of birth is required"),
    blood_group: z.string().optional(),
    skills: z.array(z.enum(skillOptions.map((item) => item.value) as [VolunteerSkill, ...VolunteerSkill[]])).min(1, "Select at least one skill"),
    locationMode: z.enum(["geolocation", "manual"]),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    ward: z.string(),
    district: z.string(),
    ngo_id: z.string().min(1, "Please select an NGO to join"),
    address: z.string().min(1, "Address is required"),
    emergency_contact_name: z.string().min(1, "Emergency contact name is required"),
    emergency_contact_phone: z.string().min(1, "Emergency contact phone is required"),
    id_proof_type: z.enum(["aadhar", "voter_id", "pan", "driving_license"]),
    id_proof_number: z.string().min(1, "ID proof number is required"),
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
  const [ngos, setNgos] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchNgos() {
      try {
        const response = await api.get("/api/auth/ngos/public");
        setNgos(response.data || []);
      } catch (err) {
        console.error("Failed to fetch NGOs", err);
      }
    }
    fetchNgos();
  }, []);

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
      email: "",
      phone: "",
      gender: "male",
      dob: "",
      blood_group: "O+",
      skills: [],
      locationMode: "manual",
      lat: null,
      lng: null,
      ward: "",
      district: "",
      ngo_id: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      id_proof_type: "aadhar",
      id_proof_number: "",
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
      email: values.email.trim(),
      phone: values.phone.trim(),
      gender: values.gender,
      dob: values.dob,
      blood_group: values.blood_group,
      skills: values.skills,
      lat: coordinates.lat,
      lng: coordinates.lng,
      ward: values.ward,
      district: values.district,
      ngo_id: values.ngo_id,
      address: values.address,
      emergency_contact_name: values.emergency_contact_name,
      emergency_contact_phone: values.emergency_contact_phone,
      id_proof_type: values.id_proof_type,
      id_proof_number: values.id_proof_number,
      availability: values.availability,
    };

    try {
      const toastId = notify.loading("Registering your profile...");
      const response = await registerVolunteer(payload);
      notify.dismiss(toastId);
      notify.success("Registration successful! Welcome to the network.");
      setRegisteredVolunteer(response);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Registration failed. Please try again.";
      setSubmitError(msg);
      notify.error(msg);
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

      <form className="mt-8 space-y-12" onSubmit={handleSubmit(onSubmit)}>
        {/* SECTION 1: ORGANIZATION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8712A]/10 text-[#E8712A] font-bold text-sm">1</div>
            <h2 className="text-xl font-bold text-[#1A3C2E] font-['Instrument_Serif']">Choose Organization</h2>
          </div>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label htmlFor="ngo_id" className="block text-xs font-bold uppercase tracking-widest text-slate-400">NGO to join</label>
              <select
                id="ngo_id"
                {...register("ngo_id")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all font-bold"
              >
                <option value="">Select an NGO</option>
                {ngos.map((ngo) => (
                  <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                ))}
              </select>
              {errors.ngo_id && <p className="text-xs text-red-600 font-medium">{errors.ngo_id.message}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL INFORMATION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8712A]/10 text-[#E8712A] font-bold text-sm">2</div>
            <h2 className="text-xl font-bold text-[#1A3C2E] font-['Instrument_Serif']">Personal Details</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
              <input id="name" type="text" {...register("name")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="Ravi Kumar" />
              {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Email Address</label>
              <input id="email" type="email" {...register("email")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="ravi@example.com" />
              {errors.email && <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
              <input id="phone" type="text" {...register("phone")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="+91..." />
              {errors.phone && <p className="text-xs text-red-600 font-medium">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="dob" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Date of Birth</label>
              <input id="dob" type="date" {...register("dob")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all" />
              {errors.dob && <p className="text-xs text-red-600 font-medium">{errors.dob.message}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Gender</label>
              <select id="gender" {...register("gender")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="blood_group" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Blood Group</label>
              <select id="blood_group" {...register("blood_group")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all">
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: SKILLS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8712A]/10 text-[#E8712A] font-bold text-sm">3</div>
            <h2 className="text-xl font-bold text-[#1A3C2E] font-['Instrument_Serif']">Skills & Capabilities</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {skillOptions.map((skill) => {
              const checked = selectedSkills?.includes(skill.value) || false;
              return (
                <button
                  key={skill.value}
                  type="button"
                  onClick={() => toggleSkill(skill.value)}
                  className={[
                    "rounded-2xl px-4 py-4 text-[10px] font-bold uppercase tracking-wider transition-all border-2 text-center",
                    checked
                      ? "bg-[#1A3C2E] text-white border-[#1A3C2E] shadow-xl shadow-[#1A3C2E]/20"
                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-200",
                  ].join(" ")}
                >
                  {skill.label}
                </button>
              );
            })}
          </div>
          {errors.skills && <p className="text-xs text-red-600 font-medium">{errors.skills.message}</p>}
        </div>

        {/* SECTION 4: IDENTIFICATION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8712A]/10 text-[#E8712A] font-bold text-sm">4</div>
            <h2 className="text-xl font-bold text-[#1A3C2E] font-['Instrument_Serif']">Identity Verification</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="id_proof_type" className="block text-xs font-bold uppercase tracking-widest text-slate-400">ID Proof Type</label>
              <select id="id_proof_type" {...register("id_proof_type")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all">
                <option value="aadhar">Aadhar Card</option>
                <option value="voter_id">Voter ID</option>
                <option value="pan">PAN Card</option>
                <option value="driving_license">Driving License</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="id_proof_number" className="block text-xs font-bold uppercase tracking-widest text-slate-400">ID Number</label>
              <input id="id_proof_number" type="text" {...register("id_proof_number")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="Enter ID number" />
              {errors.id_proof_number && <p className="text-xs text-red-600 font-medium">{errors.id_proof_number.message}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 5: LOCATION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8712A]/10 text-[#E8712A] font-bold text-sm">5</div>
            <h2 className="text-xl font-bold text-[#1A3C2E] font-['Instrument_Serif']">Location Details</h2>
          </div>
          
          <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
             <button type="button" onClick={() => setValue("locationMode", "geolocation")} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${locationMode === 'geolocation' ? 'bg-white text-[#1A3C2E] shadow-sm' : 'text-slate-500'}`}>GPS Location</button>
             <button type="button" onClick={() => setValue("locationMode", "manual")} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${locationMode === 'manual' ? 'bg-white text-[#1A3C2E] shadow-sm' : 'text-slate-500'}`}>Manual Entry</button>
          </div>

          <div className="grid gap-6">
            {locationMode === "geolocation" && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 space-y-4">
                <button type="button" onClick={handleUseMyLocation} disabled={geoLoading} className="w-full rounded-xl bg-[#1A3C2E] py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-[#2D5E47] disabled:opacity-60">
                  {geoLoading ? "Capturing GPS..." : "Capture My Precise Location"}
                </button>
                {lat && <p className="text-xs text-center text-slate-500 font-medium">📍 Coordinates: {lat.toFixed(5)}, {lng?.toFixed(5)}</p>}
                {geoMessage && <p className="text-xs text-center text-slate-400 italic">{geoMessage}</p>}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Ward / Area</label>
                <input type="text" {...register("ward")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="e.g. Ward 12" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">District</label>
                <select {...register("district")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all font-bold">
                  <option value="">Select District</option>
                  {districtList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.district && <p className="text-xs text-red-600 font-medium">{errors.district.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Residential Address</label>
              <textarea {...register("address")} rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="Street, landmark, pincode..." />
              {errors.address && <p className="text-xs text-red-600 font-medium">{errors.address.message}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 6: EMERGENCY CONTACT */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8712A]/10 text-[#E8712A] font-bold text-sm">6</div>
            <h2 className="text-xl font-bold text-[#1A3C2E] font-['Instrument_Serif']">Emergency Contact</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="ec_name" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Contact Name</label>
              <input id="ec_name" type="text" {...register("emergency_contact_name")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="Parent/Spouse/Friend" />
            </div>
            <div className="space-y-2">
              <label htmlFor="ec_phone" className="block text-xs font-bold uppercase tracking-widest text-slate-400">Contact Phone</label>
              <input id="ec_phone" type="text" {...register("emergency_contact_phone")} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all" placeholder="+91..." />
            </div>
          </div>
        </div>

        {submitError && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">{submitError}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#E8712A] hover:bg-[#D55F1B] text-white font-bold py-5 rounded-[2rem] shadow-2xl shadow-[#E8712A]/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
        >
          {isSubmitting ? "Finalizing Registration..." : "Complete Volunteer Signup →"}
        </button>
      </form>
    </section>
  );
}
