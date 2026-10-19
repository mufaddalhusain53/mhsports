"use client";

import { FormEvent, useEffect, useState } from "react";

const teams = [
  "Ezzi United",
  "Multiplize highlanders",
  "Mavericks",
  "Strikers",
  "Not played",
];
const roles = ["Batsman", "Bowler", "Wicket Keeper", "All Rounder"];
const battingStyles = [
  "RH Top Order",
  "RH Middle Order",
  "RH Finisher",
  "RH Lower Order",
  "LH Top Order",
  "LH Middle Order",
  "LH Finisher",
  "LH Lower Order",
];
const bowlingStyles = [
  "Right-Arm Medium",
  "Left-Arm Medium",
  "Off Spin",
  "Leg break",
  "Orthodox",
  "Chinaman",
];
const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

function SelectField({
  label,
  name,
  options,
  icon,
}: {
  label: string;
  name: string;
  options: string[];
  icon: string;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="text-base">
          {icon}
        </span>
        {label}
      </span>
      <select
        name={name}
        required
        defaultValue=""
        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function QuadClashRegistrationForm() {
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/quadclash100-registration", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to check registration.");
        }
        if (active) setRegistrationOpen(result.enabled);
      })
      .catch((error: unknown) => {
        if (active) {
          setRegistrationOpen(false);
          setStatus(
            error instanceof Error
              ? error.message
              : "Unable to check registration."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const phone = String(formData.get("phone_number") ?? "").replace(/\D/g, "");
    formData.set("phone_number", phone);

    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/quadclash100-registration", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 403) setRegistrationOpen(false);
        throw new Error(result.error ?? "Registration could not be submitted.");
      }
      form.reset();
      setPhotoName("");
      setPhotoError("");
      setStatus("");
      setSubmitted(true);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Registration could not be submitted."
      );
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <section
        role="status"
        className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-2xl font-black text-emerald-800">
          Registration successful
        </h2>
        <p className="mt-3 text-slate-600">
          For any changes, please contact the Quad Clash organizers.
        </p>
      </section>
    );
  }

  if (registrationOpen !== true) {
    return (
      <section className="mt-6 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-orange-700">
          Registration closed
        </span>
        <p className="mt-4 text-slate-600">
          Registration dates to be announced soon.
        </p>
        {status && (
          <p role="status" className="mt-3 text-sm font-semibold text-red-700">
            {status}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-black">Register as a player</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Fill in your details below. All fields are required.
      </p>

      <form onSubmit={submitRegistration} className="mt-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">👤</span> First Name
            </span>
            <input
              name="first_name"
              type="text"
              required
              maxLength={100}
              autoComplete="given-name"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">🪪</span> Last Name
            </span>
            <input
              name="last_name"
              type="text"
              required
              maxLength={100}
              autoComplete="family-name"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">📱</span> Phone Number
            </span>
            <span className="mt-2 flex h-12 overflow-hidden rounded-xl border border-slate-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
              <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-slate-600">
                +91
              </span>
              <input
                name="phone_number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                required
                pattern="[0-9]{10}"
                minLength={10}
                maxLength={10}
                title="Enter a 10-digit Indian phone number."
                className="min-w-0 flex-1 px-3 font-normal outline-none"
              />
            </span>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">🎂</span> Age
            </span>
            <input
              name="age"
              type="number"
              required
              min={1}
              max={100}
              step={1}
              inputMode="numeric"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">🪪</span> ITS ID
            </span>
            <input
              name="its_id"
              type="text"
              inputMode="numeric"
              required
              pattern="[0-9]{8}"
              minLength={8}
              maxLength={8}
              title="ITS ID must contain exactly 8 digits."
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <SelectField
            label="QC 100 Season 1 Team"
            name="season1_team"
            options={teams}
            icon="🏏"
          />
          <SelectField label="Role" name="role" options={roles} icon="🏏" />
          <SelectField
            label="Batting Style"
            name="batting_style"
            options={battingStyles}
            icon="🏏"
          />
          <SelectField
            label="Bowling Style"
            name="bowling_style"
            options={bowlingStyles}
            icon="🏏"
          />
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">📸</span> Player Photo (JPG or PNG, up
              to 4 MB)
            </span>
            <input
              name="photo"
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              required
              onChange={(event) => {
                const photo = event.currentTarget.files?.[0];
                const message =
                  photo && photo.size > MAX_PHOTO_SIZE
                    ? "Player photo must be 4 MB or smaller."
                    : photo &&
                        !["image/jpeg", "image/png"].includes(photo.type)
                      ? "Choose a JPG or PNG photo."
                      : "";
                event.currentTarget.setCustomValidity(message);
                setPhotoName(photo?.name ?? "");
                setPhotoError(message);
              }}
              className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-700"
            />
            {photoError && (
              <span role="alert" className="mt-2 block text-sm font-semibold text-red-700">
                {photoError}
              </span>
            )}
            {photoName && (
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Selected: {photoName}
              </span>
            )}
          </label>
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <legend className="px-2 text-base font-black text-slate-900">
            <span aria-hidden="true">✅ </span>Player consent
          </legend>
          <div className="space-y-4 text-sm leading-6 text-slate-700">
            <p>
              Our beloved Aqa Maula (TUS) has always guided us to lead a pure
              and disciplined life, free from muḥarramāt such as{" "}
              <strong>
                smoking, alcohol, tobacco, vaping, and other prohibited
                substances.
              </strong>{" "}
              As this is a religious and community-based tournament, it is our
              humble effort to embrace and uphold Maula’s noble
              teachings—creating an environment of respect, purity, and
              brotherhood.
            </p>
            <p>
              In this spirit, I sincerely commit to avoiding all forms of
              muḥarramāt during the tournament and at the venue. I understand
              that maintaining this sanctity is essential to the values our
              event represents.
            </p>
            <p>
              <strong>
                I also understand that players are not permitted to request or
                collect the entry fee from team owners.
              </strong>{" "}
              The entry process is managed as per tournament guidelines, and
              maintaining this clarity and respect is important for the smooth
              conduct of the event. In the event of any such instance, I
              acknowledge that the player concerned may be replaced
              immediately.
            </p>
            <p>
              In the rare event of non-compliance with the above guidelines, I
              acknowledge that it may lead to disqualification and a permanent
              restriction from participating in future tournaments, and that no
              refund will be applicable.
            </p>
            <p>
              I have read, understood, and wholeheartedly agree to uphold these
              values throughout the tournament.
            </p>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 border-t border-slate-200 pt-4 text-sm font-bold leading-6 text-slate-800">
            <input
              name="consent"
              type="checkbox"
              value="yes"
              required
              className="mt-1 size-4 accent-orange-600"
            />
            I have read, understood, and agree to the player consent terms above.
          </label>
        </fieldset>

        {status && (
          <p
            role="status"
            className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"
          >
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Submitting registration…" : "Submit Registration"}
        </button>
        <p className="text-xs leading-5 text-slate-500">
          Player photos are stored in public image storage so the tournament
          team can share each registered player’s photo.
        </p>
      </form>
    </section>
  );
}
