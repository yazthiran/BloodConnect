import { useState, type FormEvent } from "react";

const API = `${import.meta.env.VITE_API_URL}/api`;

type Role = "donor" | "hospital";

export default function Registration() {
  const [role, setRole] = useState<Role>("donor");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    bloodGroup: "",
    phone: "",
    city: "",
    address: "",
    lastDonationDate: "",
  });

  function update(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role,
      ...(role === "donor"
        ? {
            age: Number(form.age),
            bloodGroup: form.bloodGroup,
            phone: form.phone.trim(),
            city: form.city.trim(),
            lastDonationDate: form.lastDonationDate,
          }
        : {
            phone: form.phone.trim(),
            city: form.city.trim(),
            address: form.address.trim(),
          }),
    };

    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Registration failed (${response.status})`);
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      setSuccess(true);
      setMessage(data.message || "Registration successful!");

      setForm({
        name: "",
        email: "",
        password: "",
        age: "",
        bloodGroup: "",
        phone: "",
        city: "",
        address: "",
        lastDonationDate: "",
      });
    } catch (error) {
      const err = error as Error;
      setMessage(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check the server and API URL."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
    marginTop: "6px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 600,
    marginBottom: "14px",
    color: "#374151",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "32px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "540px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 5px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ textAlign: "center", color: "#b91c1c" }}>
          BloodConnect
        </h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>
          Create your account and help save lives.
        </p>

        <div style={{ display: "flex", gap: "10px", margin: "24px 0" }}>
          <button
            type="button"
            onClick={() => {
              setRole("donor");
              setMessage("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #dc2626",
              background: role === "donor" ? "#b91c1c" : "white",
              color: role === "donor" ? "white" : "#b91c1c",
              cursor: "pointer",
            }}
          >
            Donor
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("hospital");
              setMessage("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #dc2626",
              background: role === "hospital" ? "#b91c1c" : "white",
              color: role === "hospital" ? "white" : "#b91c1c",
              cursor: "pointer",
            }}
          >
            Hospital
          </button>
        </div>

        <h2 style={{ color: "#1f2937" }}>
          {role === "donor" ? "Donor Registration" : "Hospital Registration"}
        </h2>

        <form onSubmit={handleRegister}>
          <label style={labelStyle}>
            {role === "donor" ? "Full Name" : "Hospital Name"}
            <input
              style={inputStyle}
              name="name"
              value={form.name}
              onChange={update}
              required
              placeholder={role === "donor" ? "Enter your name" : "Enter hospital name"}
            />
          </label>

          <label style={labelStyle}>
            Email
            <input
              style={inputStyle}
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              required
              placeholder="example@email.com"
            />
          </label>

          <label style={labelStyle}>
            Password
            <input
              style={inputStyle}
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
            />
          </label>

          {role === "donor" && (
            <>
              <label style={labelStyle}>
                Age
                <input
                  style={inputStyle}
                  name="age"
                  type="number"
                  value={form.age}
                  onChange={update}
                  required
                  min={18}
                  max={100}
                  placeholder="Enter your age"
                />
              </label>

              <label style={labelStyle}>
                Blood Group
                <select
                  style={inputStyle}
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={update}
                  required
                >
                  <option value="">Select blood group</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    )
                  )}
                </select>
              </label>
            </>
          )}

          <label style={labelStyle}>
            Phone Number
            <input
              style={inputStyle}
              name="phone"
              type="tel"
              value={form.phone}
              onChange={update}
              required
              placeholder="Enter phone number"
            />
          </label>

          <label style={labelStyle}>
            City
            <input
              style={inputStyle}
              name="city"
              value={form.city}
              onChange={update}
              required
              placeholder="Enter city"
            />
          </label>

          {role === "hospital" && (
            <label style={labelStyle}>
              Hospital Address
              <textarea
                style={inputStyle}
                name="address"
                value={form.address}
                onChange={update}
                required
                rows={3}
                placeholder="Enter full hospital address"
              />
            </label>
          )}

          {role === "donor" && (
            <label style={labelStyle}>
              Last Donation Date (optional)
              <input
                style={inputStyle}
                name="lastDonationDate"
                type="date"
                value={form.lastDonationDate}
                onChange={update}
              />
            </label>
          )}

          {message && (
            <p
              role="status"
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: success ? "#dcfce7" : "#fee2e2",
                color: success ? "#166534" : "#991b1b",
              }}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "8px",
              background: loading ? "#9ca3af" : "#b91c1c",
              color: "white",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
