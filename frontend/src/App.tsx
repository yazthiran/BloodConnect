import { FormEvent, useEffect, useState } from "react";
import Registration from "./components/Registration";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Droplet,
  HeartPulse,
  Hospital,
  LogIn,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

const API = "http://localhost:5000/api";

type Role = "donor" | "hospital";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  age?: number;
  bloodGroup?: string;
  phone?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  eligible?: boolean;
};

type BloodRequest = {
  _id: string;
  hospitalName: string;
  patientName: string;
  bloodGroup: string;
  units: number;
  location: string;
  emergencyLevel: string;
  status: string;
  createdAt?: string;
};

type SessionResponse = {
  token: string;
  user: User;
  message?: string;
};

const groups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

async function api(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Check that MongoDB and the backend server are running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status}).`
    );
  }

  return data;
}

export default function App() {
  const [page, setPage] = useState("home");
  const [role, setRole] = useState<Role>("donor");
  const [mode, setMode] = useState<"login" | "register">("register");

  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("bc_user") || "null");
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("bc_token") || ""
  );

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState<User[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);

  const [stats, setStats] = useState({
    donors: 0,
    hospitals: 0,
    requests: 0,
    pendingRequests: 0,
  });

  const [searchGroup, setSearchGroup] = useState("");
  const [searchCity, setSearchCity] = useState("");

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  async function loadData() {
    try {
      const [d, r, s] = await Promise.all([
        api("/donors"),
        api("/blood-requests"),
        api("/dashboard"),
      ]);

      setDonors(d);
      setRequests(r);
      setStats(s);
    } catch (err) {
      console.error("Could not load dashboard data:", err);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function saveSession(data: SessionResponse) {
    localStorage.setItem("bc_token", data.token);
    localStorage.setItem("bc_user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
    setMessage(data.message || "Welcome to BloodConnect.");
    setPage("dashboard");

    void loadData();
  }

  function logout() {
    localStorage.removeItem("bc_token");
    localStorage.removeItem("bc_user");

    setToken("");
    setUser(null);
    setPage("home");
    setMessage("You have logged out.");
  }

  function getLocation() {
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setMessage("Location captured. Submit the form to save it.");
      },
      () => {
        setMessage(
          "Location permission was not granted. You can still enter your city/location manually."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const fd = new FormData(e.currentTarget);

    const payload: Record<string, unknown> = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
      role,
      phone: String(fd.get("phone") || ""),
      city: String(fd.get("city") || ""),
      latitude: location?.latitude,
      longitude: location?.longitude,
    };

    if (role === "donor") {
      payload.age = Number(fd.get("age"));
      payload.bloodGroup = String(fd.get("bloodGroup") || "");
      payload.lastDonationDate = String(
        fd.get("lastDonationDate") || ""
      );
    } else {
      payload.address = String(fd.get("address") || "");
    }

    try {
      const data: SessionResponse = await api(
        `/auth/${mode === "register" ? "register" : "login"}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      saveSession(data);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchDonors(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    try {
      const params = new URLSearchParams();

      if (searchGroup) {
        params.set("bloodGroup", searchGroup);
      }

      if (searchCity.trim()) {
        params.set("city", searchCity.trim());
      }

      const query = params.toString();

      setDonors(
        await api(`/donors${query ? `?${query}` : ""}`)
      );
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Could not search donors."
      );
    }
  }

  async function submitRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const data = await api(
        "/blood-requests",
        {
          method: "POST",
          body: JSON.stringify({
            patientName: fd.get("patientName"),
            bloodGroup: fd.get("bloodGroup"),
            units: Number(fd.get("units")),
            location: fd.get("location"),
            emergencyLevel: fd.get("emergencyLevel"),
            latitude: location?.latitude,
            longitude: location?.longitude,
          }),
        },
        token
      );

      setMessage(data.message || "Blood request submitted successfully.");
      form.reset();
      await loadData();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Could not create request."
      );
    } finally {
      setLoading(false);
    }
  }

  const goAuth = (r: Role, m: "login" | "register") => {
    setRole(r);
    setMode(m);
    setLocation(null);
    setMessage("");
    setPage("auth");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}>
          <span className="brand-mark">
            <Droplet size={23} fill="currentColor" />
          </span>
          <span>
            Blood<span className="brand-light">Connect</span>
            <small>SMART BLOOD DONOR PLATFORM</small>
          </span>
        </button>

        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("find")}>Find Donors</button>
          <button onClick={() => setPage("requests")}>Blood Requests</button>
          <button onClick={() => setPage("dashboard")}>Dashboard</button>
        </nav>

        {user ? (
          <button className="outline-btn small" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        ) : (
          <button
            className="primary-btn small"
            onClick={() => goAuth("donor", "login")}
          >
            <LogIn size={16} /> Login
          </button>
        )}
      </header>

      {message && (
        <div className="notice" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {page === "home" && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <HeartPulse size={16} /> EVERY DONATION MATTERS
              </div>
              <h1>
                One connection.
                <br />
                <span>Many lives saved.</span>
              </h1>
              <p>
                Connecting blood donors and hospitals to help people find
                the support they need during emergencies.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-btn"
                  onClick={() => goAuth("donor", "register")}
                >
                  Become a Donor <ArrowRight size={17} />
                </button>
                <button
                  className="outline-btn"
                  onClick={() => setPage("find")}
                >
                  Find Blood Donors
                </button>
              </div>

              <div className="trust-line">
                <ShieldCheck size={17} /> Simple registration ·
                Location-enabled · Community-powered
              </div>
            </div>

            <div className="hero-art">
              <div className="pulse pulse-one"></div>
              <div className="pulse pulse-two"></div>
              <div className="blood-drop">
                <Droplet size={100} fill="currentColor" strokeWidth={1.2} />
                <HeartPulse size={43} className="drop-heart" />
              </div>

              <div className="float-card">
                <span className="float-icon">
                  <Users size={18} />
                </span>
                <span>
                  <b>{stats.donors} registered donors</b>
                  <small>Growing donor community</small>
                </span>
              </div>

              <div className="float-card second">
                <span className="float-icon amber">
                  <Activity size={18} />
                </span>
                <span>
                  <b>{stats.pendingRequests} pending requests</b>
                  <small>Emergency requests</small>
                </span>
              </div>
            </div>
          </section>

          <section className="stats-row">
            <div className="stat-card">
              <span className="stat-icon"><Users /></span>
              <span><b>{stats.donors}</b><small>Registered Donors</small></span>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Hospital /></span>
              <span><b>{stats.hospitals}</b><small>Registered Hospitals</small></span>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Droplet /></span>
              <span><b>{stats.requests}</b><small>Blood Requests</small></span>
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <span className="eyebrow">HOW IT WORKS</span>
              <h2>Help starts with a connection</h2>
              <p>A simple flow designed to make donor discovery easier.</p>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <span className="feature-icon"><Users /></span>
                <h3>Register as a donor</h3>
                <p>Create your donor account and share your blood group and city.</p>
                <button className="text-btn" onClick={() => goAuth("donor", "register")}>
                  Donor registration <ArrowRight size={15} />
                </button>
              </article>

              <article className="feature-card">
                <span className="feature-icon"><Search /></span>
                <h3>Find eligible donors</h3>
                <p>Search registered donors by blood group and city.</p>
                <button className="text-btn" onClick={() => setPage("find")}>
                  Search donors <ArrowRight size={15} />
                </button>
              </article>

              <article className="feature-card">
                <span className="feature-icon"><Hospital /></span>
                <h3>Hospitals request blood</h3>
                <p>Hospital accounts can submit and track emergency blood requests.</p>
                <button className="text-btn" onClick={() => goAuth("hospital", "register")}>
                  Hospital registration <ArrowRight size={15} />
                </button>
              </article>
            </div>
          </section>

          <section className="join-banner">
            <div>
              <span className="eyebrow">JOIN BLOODCONNECT</span>
              <h2>Be there when someone needs you.</h2>
              <p>Register today to become part of the donor community.</p>
            </div>
            <button className="white-btn" onClick={() => goAuth("donor", "register")}>
              Register now <ArrowRight size={16} />
            </button>
          </section>
        </main>
      )}

      {page === "auth" && (
        <main className="auth-layout">
          <section className="auth-side">
            <span className="eyebrow">BLOODCONNECT ACCOUNT</span>
            <h1>{mode === "register" ? "Join the life-saving network." : "Welcome back."}</h1>
            <p>Choose your account type to access the correct registration and login page.</p>

            <div className="role-cards">
              <button
                className={role === "donor" ? "role-card selected" : "role-card"}
                onClick={() => { setRole("donor"); setMessage(""); }}
              >
                <Users />
                <span><b>Donor</b><small>Find opportunities to help</small></span>
                <span className="radio-dot" />
              </button>

              <button
                className={role === "hospital" ? "role-card selected" : "role-card"}
                onClick={() => { setRole("hospital"); setMessage(""); }}
              >
                <Hospital />
                <span><b>Hospital</b><small>Manage emergency requests</small></span>
                <span className="radio-dot" />
              </button>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-title">
              <span className="auth-icon">
                {role === "donor" ? <Users /> : <Hospital />}
              </span>
              <h2>{role === "donor" ? "Donor" : "Hospital"} {mode === "register" ? "Registration" : "Login"}</h2>
              <p>{mode === "register" ? "Create your secure account to continue." : "Sign in to your account."}</p>
            </div>

            <form onSubmit={submitAuth} className="form-grid">
              {mode === "register" && (
                <label className="full">
                  {role === "hospital" ? "Hospital name" : "Full name"}
                  <input
                    name="name"
                    placeholder={role === "hospital" ? "Enter hospital name" : "Enter your full name"}
                    required
                  />
                </label>
              )}

              <label className="full">
                Email address
                <input type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
              </label>

              <label className="full">
                Password
                <input
                  type="password"
                  name="password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
              </label>

              {mode === "register" && (
                <>
                  <label>
                    Contact number
                    <input name="phone" type="tel" placeholder="Phone number" required />
                  </label>
                  <label>
                    City
                    <input name="city" placeholder="Your city" required />
                  </label>

                  {role === "donor" ? (
                    <>
                      <label>
                        Age
                        <input name="age" type="number" min="1" max="120" required />
                      </label>
                      <label>
                        Blood group
                        <select name="bloodGroup" required defaultValue="">
                          <option value="" disabled>Select group</option>
                          {groups.map((g) => <option key={g}>{g}</option>)}
                        </select>
                      </label>
                      <label className="full">
                        Last donation date (optional)
                        <input name="lastDonationDate" type="date" />
                      </label>
                    </>
                  ) : (
                    <label className="full">
                      Hospital address
                      <input name="address" placeholder="Street, area, city" required />
                    </label>
                  )}

                  <div className="full location-box">
                    <div>
                      <MapPin size={18} />
                      <span>
                        <b>Location (optional)</b>
                        <small>
                          {location
                            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                            : "Allow browser location to save coordinates"}
                        </small>
                      </span>
                    </div>
                    <button type="button" className="outline-btn small" onClick={getLocation}>
                      Get location
                    </button>
                  </div>
                </>
              )}

              <button className="primary-btn full submit-btn" disabled={loading}>
                {loading ? "Please wait..." : mode === "register" ? "Create account" : "Login"}
                <ArrowRight size={17} />
              </button>
            </form>

            <p className="switch-auth">
              {mode === "register" ? "Already have an account?" : "New to BloodConnect?"}
              {" "}
              <button onClick={() => { setMode(mode === "register" ? "login" : "register"); setMessage(""); }}>
                {mode === "register" ? "Login" : "Register"}
              </button>
            </p>
          </section>
        </main>
      )}

      {page === "find" && (
        <main className="page-container">
          <div className="page-heading">
            <span className="eyebrow">DONOR DIRECTORY</span>
            <h1>Find blood donors</h1>
            <p>Search registered, age-eligible donors by blood group and city.</p>
          </div>

          <form className="search-panel" onSubmit={searchDonors}>
            <label>
              Blood group
              <select value={searchGroup} onChange={(e) => setSearchGroup(e.target.value)}>
                <option value="">All blood groups</option>
                {groups.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label>
              City
              <input value={searchCity} onChange={(e) => setSearchCity(e.target.value)} placeholder="Enter city" />
            </label>
            <button className="primary-btn"><Search size={17} /> Search donors</button>
          </form>

          <div className="result-heading">
            <h2>Donor results</h2>
            <span>{donors.length} found</span>
          </div>

          {donors.length ? (
            <div className="donor-grid">
              {donors.map((d) => (
                <article className="donor-card" key={d.id}>
                  <span className="blood-badge">{d.bloodGroup}</span>
                  <h3>{d.name}</h3>
                  <p><MapPin size={15} />{d.city || "Location not provided"}</p>
                  <span className="eligible"><CheckCircle2 size={15} /> Age eligible (18+)</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={30} />
              <h3>No donors to show yet</h3>
              <p>Try another search, or register a donor account first.</p>
              <button className="outline-btn" onClick={() => goAuth("donor", "register")}>
                Register as donor
              </button>
            </div>
          )}
        </main>
      )}

      {page === "requests" && (
        <main className="page-container">
          <div className="page-heading">
            <span className="eyebrow">COMMUNITY NEEDS</span>
            <h1>Emergency blood requests</h1>
            <p>View the latest requests submitted by registered hospitals.</p>
          </div>

          {user?.role === "hospital" && (
            <section className="request-form-card">
              <h2>Create a blood request</h2>
              <form onSubmit={submitRequest} className="form-grid">
                <label>
                  Patient name
                  <input name="patientName" required />
                </label>
                <label>
                  Blood group
                  <select name="bloodGroup" required defaultValue="">
                    <option value="" disabled>Select group</option>
                    {groups.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </label>
                <label>
                  Units required
                  <input name="units" type="number" min="1" required />
                </label>
                <label>
                  Emergency level
                  <select name="emergencyLevel" required defaultValue="">
                    <option value="" disabled>Select level</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>
                <label className="full">
                  Location
                  <input name="location" placeholder="Area / city / hospital location" required />
                </label>
                <div className="full">
                  <button type="button" className="outline-btn small" onClick={getLocation}>
                    <MapPin size={15} /> Capture current location
                  </button>
                </div>
                <button className="primary-btn full" disabled={loading}>
                  Submit emergency request <ArrowRight size={16} />
                </button>
              </form>
            </section>
          )}

          <div className="request-list">
            {requests.map((r) => (
              <article className="request-card" key={r._id}>
                <span className={`urgency ${r.emergencyLevel.toLowerCase()}`}>
                  {r.emergencyLevel} priority
                </span>
                <h3>{r.bloodGroup} blood needed</h3>
                <p><Hospital size={15} />{r.hospitalName}</p>
                <p><Users size={15} />Patient: {r.patientName}</p>
                <p><MapPin size={15} />{r.location}</p>
                <div className="request-meta">
                  <span>{r.units} unit(s)</span>
                  <span>{r.status}</span>
                </div>
              </article>
            ))}
          </div>

          {!requests.length && (
            <div className="empty-state">
              <Droplet size={30} />
              <h3>No requests yet</h3>
              <p>Hospital accounts can create emergency requests after logging in.</p>
              <button className="primary-btn" onClick={() => goAuth("hospital", "login")}>
                Hospital login
              </button>
            </div>
          )}
        </main>
      )}

      {page === "dashboard" && (
        <main className="page-container">
          <div className="page-heading">
            <span className="eyebrow">OVERVIEW</span>
            <h1>{user ? `Welcome, ${user.name}` : "BloodConnect dashboard"}</h1>
            <p>
              {user
                ? `${user.role === "donor" ? "Donor" : "Hospital"} account · ${user.email}`
                : "A quick overview of the registered BloodConnect community."}
            </p>
          </div>

          {!user && (
            <div className="notice inline-notice">
              Login to access your account. Public dashboard statistics are shown below.
            </div>
          )}

          <div className="dashboard-stats">
            <div className="dashboard-stat"><Users /><small>Registered donors</small><b>{stats.donors}</b></div>
            <div className="dashboard-stat"><Hospital /><small>Registered hospitals</small><b>{stats.hospitals}</b></div>
            <div className="dashboard-stat"><Droplet /><small>Total requests</small><b>{stats.requests}</b></div>
            <div className="dashboard-stat"><Activity /><small>Pending requests</small><b>{stats.pendingRequests}</b></div>
          </div>

          {user?.role === "donor" && (
            <section className="profile-panel">
              <h2>Your donor profile</h2>
              <p><b>Blood group:</b> {user.bloodGroup || "Not provided"}</p>
              <p><b>City:</b> {user.city || "Not provided"}</p>
              <p><b>Basic age eligibility:</b> {user.eligible ? "Age check passed (18+)" : "Age check not passed"}</p>
              <p className="muted">This is only a basic age check, not medical eligibility approval.</p>
            </section>
          )}

          {user?.role === "hospital" && (
            <section className="profile-panel">
              <h2>Hospital tools</h2>
              <p>Create and view emergency requests for patients.</p>
              <button className="primary-btn" onClick={() => setPage("requests")}>
                Open blood requests <ArrowRight size={16} />
              </button>
            </section>
          )}

          <div className="result-heading">
            <h2>Recent requests</h2>
            <button className="text-btn" onClick={() => setPage("requests")}>
              View all <ArrowRight size={15} />
            </button>
          </div>

          <div className="request-list">
            {requests.slice(0, 4).map((r) => (
              <article className="request-card" key={r._id}>
                <span className={`urgency ${r.emergencyLevel.toLowerCase()}`}>
                  {r.emergencyLevel} priority
                </span>
                <h3>{r.bloodGroup} blood needed</h3>
                <p><Hospital size={15} />{r.hospitalName}</p>
                <p><MapPin size={15} />{r.location}</p>
                <div className="request-meta">
                  <span>{r.units} unit(s)</span>
                  <span>{r.status}</span>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}

      <footer>
        <button className="brand footer-brand" onClick={() => setPage("home")}>
          <span className="brand-mark">
            <Droplet size={20} fill="currentColor" />
          </span>
          <span>
            Blood<span className="brand-light">Connect</span>
            <small>SMART BLOOD DONOR PLATFORM</small>
          </span>
        </button>
        <p>Built to connect donors, hospitals and people in need.</p>
        <span>React · TypeScript · Express · MongoDB</span>
      </footer>
    </div>
  );
}
