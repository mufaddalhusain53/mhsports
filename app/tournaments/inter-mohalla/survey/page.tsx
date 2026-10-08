"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function MohallaSurveyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const selectedCity = formData.get("city") as string;
    const otherCityValue = formData.get("otherCity") as string | null;

    const name = (formData.get("name") as string).trim();
    const age = Number(formData.get("age"));
    const itsId = (formData.get("itsId") as string).trim();
    const mobile = (formData.get("mobile") as string).trim();
    const jamiat = formData.get("jamiat") as string;
    const mohalla = (formData.get("mohalla") as string).trim();
    const teamName = (formData.get("teamName") as string).trim();

    const otherCity =
      selectedCity === "Others"
        ? otherCityValue?.trim() || null
        : null;

    const { error } = await supabase
      .from("mohalla_survey_responses")
      .insert({
        name,
        age,
        its_id: itsId,
        mobile_number: mobile,
        city: selectedCity,
        other_city: otherCity,
        jamiat,
        mohalla,
        team_name: teamName,
        availability_confirmed:
          formData.get("availability") === "on",
      });

    setSubmitting(false);

    if (error) {
      console.error("Supabase submission error:", error);

      if (error.code === "23505") {
        setErrorMessage(
          "A survey has already been submitted using this ITS ID. If you believe this is incorrect, please contact the organizers."
        );
      } else {
        setErrorMessage(
          "We could not submit your survey right now. Please check your details and try again."
        );
      }

      return;
    }

    setSubmitted(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (submitted) {
    return (
      <main className="min-h-[calc(100vh-112px)] bg-slate-50 px-4 py-12 sm:px-6 md:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-black text-slate-900">
              Survey Submitted
            </h1>

            <p className="mt-4 leading-7 text-slate-600">
              Thank you for participating in the Inter Mohalla Leather Cricket
              Tournament survey.
            </p>

            <p className="mt-2 leading-7 text-slate-600">
              Your response has been recorded successfully.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl">

        {/* Hashemi Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src="/hashemi-logo.png"
            alt="Hashemi Mohalla"
            className="h-36 w-auto object-contain sm:h-44"
          />
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500 sm:text-sm">
            Hashemi Mohalla Presents
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight text-slate-900 sm:text-4xl md:text-5xl">
            Inter Mohalla {" "}
            <br className="sm:hidden" />
            Leather Cricket Tournament
          </h1>
        </div>

        {/* About Tournament */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-slate-900">
            About the Tournament
          </h2>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">

            <p>
              MH Sports is organizing a{" "}
              <strong className="text-slate-900">
                Inter-Mohalla Leather Cricket Tournament in association with
                Hashemi Mohalla
              </strong>{" "}
              for players from Mumbai &amp; Marol Jamiat.
            </p>

            <p>
              Matches are proposed to be played every{" "}
              <strong className="text-slate-900">
                Saturday from 7:00 AM to 9:00 AM
              </strong>
              , tentatively starting from{" "}
              <strong className="text-slate-900">
                January 2027
              </strong>
              , subject to the completion of the preceding tournaments.
            </p>

            <p>
              Matches may also be scheduled on{" "}
              <strong className="text-slate-900">
                National Holidays
              </strong>
              . In case of any delays or unavoidable circumstances, matches
              may occasionally be scheduled on{" "}
              <strong className="text-slate-900">
                Mondays
              </strong>
              .
            </p>

            <p>
              The purpose of this survey is to identify players from{" "}
              <strong className="text-slate-900">
                Mumbai &amp; Marol Jamiat
              </strong>{" "}
              who regularly play leather cricket and may be interested in
              participating in the tournament.
            </p>

          </div>

          {/* Important Notice */}
          <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex gap-3">
              <div className="text-xl">⚠️</div>

              <div>
                <p className="font-bold text-orange-900">
                  Important
                </p>

                <p className="mt-1 text-sm leading-6 text-orange-800">
                  Please submit this survey only if you can commit to
                  Saturday matches from 7:00 AM to 9:00 AM, National
                  Holidays, and occasional Monday matches if required.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Player Details Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-7"
        >
          <div>
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-xl font-black text-slate-900">
                Player Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Please enter your details below.
              </p>
            </div>

            <div className="mt-6 space-y-5">

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Name <span className="text-red-500">*</span>
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* Age */}
              <div>
                <label
                  htmlFor="age"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Age <span className="text-red-500">*</span>
                </label>

                <input
                  id="age"
                  name="age"
                  type="number"
                  min={18}
                  max={100}
                  required
                  placeholder="Enter your age"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* ITS ID */}
              <div>
                <label
                  htmlFor="itsId"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  ITS ID <span className="text-red-500">*</span>
                </label>

                <input
                  id="itsId"
                  name="itsId"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  minLength={8}
                  required
                  placeholder="Enter 8 digit ITS ID"
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value
                      .replace(/\D/g, "")
                      .slice(0, 8);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  ITS ID must contain exactly 8 digits.
                </p>
              </div>

              {/* Mobile */}
              <div>
                <label
                  htmlFor="mobile"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Mobile Number <span className="text-red-500">*</span>
                </label>

                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  minLength={10}
                  required
                  placeholder="Enter 10 digit mobile number"
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* City */}
              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  City <span className="text-red-500">*</span>
                </label>

                <select
                  id="city"
                  name="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">
                    Select your city / locality
                  </option>

                  <option value="Mumbai Town">
                    Mumbai Town
                  </option>
                  <option value="Bandra">
                    Bandra
                  </option>
                  <option value="Andheri">
                    Andheri
                  </option>
                  <option value="Mira Road">
                    Mira Road
                  </option>
                  <option value="Bhayander">
                    Bhayander
                  </option>
                  <option value="Nalasopara">
                    Nalasopara
                  </option>
                  <option value="Vasai">
                    Vasai
                  </option>
                  <option value="Kurla">
                    Kurla
                  </option>
                  <option value="Thane">
                    Thane
                  </option>
                  <option value="Marol">
                    Marol
                  </option>
                  <option value="Dombivali">
                    Dombivali
                  </option>
                  <option value="Kalyan">
                    Kalyan
                  </option>
                  <option value="Mumbra">
                    Mumbra
                  </option>
                  <option value="Vashind">
                    Vashind
                  </option>
                  <option value="Kharghar">
                    Kharghar
                  </option>
                  <option value="Vashi">
                    Vashi
                  </option>
                  <option value="Nerul">
                    Nerul
                  </option>
                  <option value="Others">
                    Others
                  </option>
                </select>
              </div>

              {/* Other City */}
              {city === "Others" && (
                <div>
                  <label
                    htmlFor="otherCity"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Please specify your city / locality{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="otherCity"
                    name="otherCity"
                    type="text"
                    required
                    placeholder="Enter your city / locality"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              )}

              {/* Jamiat */}
              <div>
                <label
                  htmlFor="jamiat"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Jamiat <span className="text-red-500">*</span>
                </label>

                <select
                  id="jamiat"
                  name="jamiat"
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">
                    Select Jamiat
                  </option>

                  <option value="Mumbai">
                    Mumbai
                  </option>

                  <option value="Marol">
                    Marol
                  </option>
                </select>
              </div>

              {/* Jamaat / Mohalla */}
              <div>
                <label
                  htmlFor="mohalla"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Jamaat / Mohalla{" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  id="mohalla"
                  name="mohalla"
                  type="text"
                  required
                  placeholder="Enter your Jamaat / Mohalla"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

            </div>
          </div>

          {/* Cricket Details */}
          <div className="mt-10">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-xl font-black text-slate-900">
                Cricket Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tell us about the team you currently play for.
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="teamName"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Current Cricket Team Name{" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                id="teamName"
                name="teamName"
                type="text"
                required
                placeholder="Enter the name of your current cricket team"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Please enter the team you currently play for on Saturdays or
                Sundays.
              </p>
            </div>
          </div>

          {/* Availability */}
          <div className="mt-10">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-xl font-black text-slate-900">
                Tournament Availability
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Please confirm your availability before submitting.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                I confirm that I am available to play matches on{" "}
                <strong>Saturdays from 7:00 AM to 9:00 AM</strong>,
                as well as on <strong>National Holidays</strong> and,
                if required due to delays, <strong>Mondays</strong>.
              </p>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-orange-200 bg-white p-4 transition hover:border-orange-400">
                <input
                  type="checkbox"
                  name="availability"
                  required
                  className="mt-1 h-5 w-5 shrink-0 accent-orange-500"
                />

                <span>
                  <span className="block font-bold text-slate-900">
                    I confirm my availability
                  </span>

                  <span className="mt-1 block text-sm leading-5 text-slate-500">
                    I understand the proposed schedule and confirm that I am
                    available to participate.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              <p className="font-bold">
                Unable to submit
              </p>

              <p className="mt-1">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="mt-10">
            <button
              type="submit"
              disabled={submitting}
              className="h-14 w-full rounded-xl bg-orange-500 px-6 text-base font-black text-white shadow-sm transition hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Survey"}
            </button>

            <p className="mt-4 text-center text-xs text-slate-500">
              Fields marked with{" "}
              <span className="text-red-500">*</span> are required.
            </p>
          </div>
        </form>

        {/* Footer */}
        <p className="px-4 py-8 text-center text-xs leading-5 text-slate-400">
          Hashemi Mohalla • Mufaddal Husain Sports
        </p>
      </div>
    </main>
  );
}