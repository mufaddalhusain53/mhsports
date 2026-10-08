"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type SurveyResponse = {
  id: number;
  name: string;
  age: number;
  its_id: string;
  mobile_number: string;
  city: string;
  other_city: string | null;
  jamiat: string;
  mohalla: string;
  team_name: string;
  availability_confirmed: boolean;
  created_at: string;
};

type Props = {
  responses: SurveyResponse[];
};

export default function AdminDashboard({ responses }: Props) {
  const [tournament, setTournament] = useState("mohalla");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All");
  const [jamiat, setJamiat] = useState("All");

  const cities = useMemo(() => {
    return Array.from(
      new Set(responses.map((response) => response.city))
    ).sort();
  }, [responses]);

  const filteredResponses = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return responses.filter((response) => {
      const matchesSearch =
        !searchValue ||
        response.name.toLowerCase().includes(searchValue) ||
        response.its_id.toLowerCase().includes(searchValue) ||
        response.mobile_number.includes(searchValue) ||
        response.mohalla.toLowerCase().includes(searchValue) ||
        response.team_name.toLowerCase().includes(searchValue);

      const matchesCity =
        city === "All" || response.city === city;

      const matchesJamiat =
        jamiat === "All" || response.jamiat === jamiat;

      return (
        matchesSearch &&
        matchesCity &&
        matchesJamiat
      );
    });
  }, [responses, search, city, jamiat]);

  function downloadExcel() {
  const rows = filteredResponses.map((response, index) => ({
    "#": index + 1,
    "Name": response.name,
    "Age": response.age,
    "ITS ID": response.its_id,
    "Mobile Number": response.mobile_number,
    "City":
      response.city === "Others"
        ? response.other_city ?? ""
        : response.city,
    "Jamiat": response.jamiat,
    "Jamaat / Mohalla": response.mohalla,
    "Current Cricket Team": response.team_name,
    "Availability Confirmed": response.availability_confirmed
      ? "Yes"
      : "No",
    "Submitted":
      new Date(response.created_at).toLocaleString("en-IN"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 25 },
    { wch: 28 },
    { wch: 20 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Mohalla Survey"
  );

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  XLSX.writeFile(
    workbook,
    `Mohalla_Tournament_Registrations_${date}.xlsx`
  );
}

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    window.location.href = "/admin";
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">
            <img
              src="/mhsports-logo.png"
              alt="Mufaddal Husain Sports"
              className="h-12 w-auto object-contain"
            />

            <div>
              <h1 className="text-lg font-black text-slate-900 sm:text-xl">
                Admin Dashboard
              </h1>

              <p className="text-xs text-slate-500">
                Mufaddal Husain Sports
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* TOURNAMENT TABS */}
        <div className="rounded-2xl bg-white p-2 shadow-sm">
          <div className="grid grid-cols-3 gap-2">

            <button
              onClick={() => setTournament("friendshipcup")}
              className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                tournament === "friendshipcup"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Friendship Cup
            </button>

            <button
              onClick={() => setTournament("quadclash100")}
              className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                tournament === "quadclash100"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Quad Clash 100
            </button>

            <button
              onClick={() => setTournament("mohalla")}
              className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                tournament === "mohalla"
                  ? "bg-orange-500 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Mohalla Tournament
            </button>

          </div>
        </div>

        {/* COMING SOON */}
        {tournament !== "mohalla" && (
          <div className="mt-6 rounded-2xl bg-white p-12 text-center shadow-sm">

            <div className="text-5xl">
              🏏
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-900">
              {tournament === "friendshipcup"
                ? "Friendship Cup"
                : "Quad Clash 100"}
            </h2>

            <p className="mt-2 text-slate-500">
              Registration management will be available here soon.
            </p>

            <span className="mt-5 inline-block rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              Coming Soon
            </span>
          </div>
        )}

        {/* MOHALLA */}
        {tournament === "mohalla" && (
          <>
            {/* TITLE */}
            <div className="mt-6">
              <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
                Mohalla Tournament
              </p>

              <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
  <div>
    <h2 className="text-3xl font-black text-slate-900">
      Survey Responses
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Manage submitted player survey responses.
    </p>
  </div>

  <button
    type="button"
    onClick={downloadExcel}
    disabled={filteredResponses.length === 0}
    className="inline-flex h-11 items-center justify-center rounded-xl bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    ↓ Download Excel
  </button>
</div>
            </div>

            {/* STAT CARDS */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Total Responses
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900">
                  {responses.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Showing
                </p>

                <p className="mt-2 text-3xl font-black text-orange-500">
                  {filteredResponses.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Mumbai Jamiat
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900">
                  {
                    responses.filter(
                      (response) => response.jamiat === "Mumbai"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Marol Jamiat
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900">
                  {
                    responses.filter(
                      (response) => response.jamiat === "Marol"
                    ).length
                  }
                </p>
              </div>

            </div>

            {/* FILTERS */}
            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">

              <div className="grid gap-4 md:grid-cols-3">

                <div className="md:col-span-1">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Search
                  </label>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Name, ITS ID, mobile, team..."
                    className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    City
                  </label>

                  <select
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-orange-500"
                  >
                    <option value="All">All Cities</option>

                    {cities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Jamiat
                  </label>

                  <select
                    value={jamiat}
                    onChange={(event) =>
                      setJamiat(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-orange-500"
                  >
                    <option value="All">All Jamiats</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Marol">Marol</option>
                  </select>
                </div>

              </div>
            </div>

            {/* TABLE */}
            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">

              <div className="overflow-x-auto">

                <table className="min-w-[1100px] w-full text-left text-sm">

                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 font-bold text-slate-600">
                        #
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        Player
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        ITS ID
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        Mobile
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        Age
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        City
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        Jamiat
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        Jamaat / Mohalla
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        Cricket Team
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600">
                        Submitted
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredResponses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-5 py-12 text-center text-slate-500"
                        >
                          No responses found.
                        </td>
                      </tr>
                    ) : (
                      filteredResponses.map(
                        (response, index) => (
                          <tr
                            key={response.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 font-semibold text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-900">
                                {response.name}
                              </div>
                            </td>

                            <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                              {response.its_id}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {response.mobile_number}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {response.age}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {response.city === "Others"
                                ? response.other_city
                                : response.city}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {response.jamiat}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {response.mohalla}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {response.team_name}
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {new Date(
                                response.created_at
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        )
                      )
                    )}

                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                Showing {filteredResponses.length} of{" "}
                {responses.length} responses
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}