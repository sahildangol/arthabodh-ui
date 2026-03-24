import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { signup } from "../../api/authService";
import { FaAddressCard } from "react-icons/fa";
import { BiLoaderAlt } from "react-icons/bi";
import "./Auth.css";

export const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    server: "",
  });

  const [loading, setLoading] = useState(false);

  const validate = () => {
    let tempErrors = {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      server: "",
    };
    let isValid = true;

    if (!/^[a-zA-Z]{2,30}$/.test(formData.first_name)) {
      tempErrors.first_name = "Letters only (2-30 chars).";
      isValid = false;
    }
    if (!/^[a-zA-Z]{2,30}$/.test(formData.last_name)) {
      tempErrors.last_name = "Letters only (2-30 chars).";
      isValid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      tempErrors.email = "Invalid email format.";
      isValid = false;
    }
    if (formData.password.length < 8) {
      tempErrors.password = "Minimum 8 characters required.";
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await signup(formData);
      navigate("/login");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Registration failed.";
      setErrors((prev) => ({
        ...prev,
        server: typeof msg === "string" ? msg : "Registration rejection.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <header className="auth-header">
          <div className="auth-icon-terminal">
            <FaAddressCard size={40} />
          </div>
          <h2>CREATE Account</h2>
          <p>Register new profile</p>
        </header>

        {errors.server && (
          <div className="auth-server-error">{errors.server}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="input-group">
            <label>First Name</label>
            <input
              type="text"
              className={`auth-input ${errors.first_name ? "input-error" : ""}`}
              placeholder="first_name"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
            />
            {errors.first_name && (
              <span className="error-label-mini">{errors.first_name}</span>
            )}
          </div>

          <div className="input-group">
            <label>Last Name</label>
            <input
              type="text"
              className={`auth-input ${errors.last_name ? "input-error" : ""}`}
              placeholder="last_name"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
            />
            {errors.last_name && (
              <span className="error-label-mini">{errors.last_name}</span>
            )}
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              className={`auth-input ${errors.email ? "input-error" : ""}`}
              placeholder="user@arthabodh.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            {errors.email && (
              <span className="error-label-mini">{errors.email}</span>
            )}
          </div>

          <div className="input-group">
            <label>PASSWORD</label>
            <input
              type="password"
              className={`auth-input ${errors.password ? "input-error" : ""}`}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            {errors.password && (
              <span className="error-label-mini">{errors.password}</span>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <BiLoaderAlt className="spin-icon" />
            ) : (
              "Complete Registration"
            )}
          </button>
        </form>

        <div className="auth-footer">
          Existing User? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};
