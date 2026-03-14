import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { signup } from "../../api/authService";
import Button from "../../common/components/Button";
import { FaAddressCard } from "react-icons/fa";
import "./Login.css";

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

  // 1. Regex Validation Logic
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
      tempErrors.first_name = "Enter a valid first name (letters only).";
      isValid = false;
    }

    if (!/^[a-zA-Z]{2,30}$/.test(formData.last_name)) {
      tempErrors.last_name = "Enter a valid last name (letters only).";
      isValid = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      tempErrors.email = "Please enter a valid email address.";
      isValid = false;
    }

    if (formData.password.length < 8) {
      tempErrors.password = "Password must be at least 8 characters.";
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
      alert("Account created! Please login.");
      navigate("/login");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Signup failed. Try again.";
      setErrors((prev) => ({
        ...prev,
        server: typeof msg === "string" ? msg : "Check your details.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="auth-card" noValidate>
        <div
          className="auth-icon-container"
          style={{ fontSize: "4rem", display: "flex", justifyContent: "center", color: "black" }}
        >
          <FaAddressCard />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          Create Account
        </h2>

        {errors.server && (
          <p className="error-text server-error">{errors.server}</p>
        )}

        {/* First Name */}
        <div className="input-group">
          <input
            type="text"
            placeholder="First Name"
            value={formData.first_name}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            className={errors.first_name ? "input-error" : ""}
          />
          {errors.first_name && (
            <span className="error-label">{errors.first_name}</span>
          )}
        </div>

        {/* Last Name */}
        <div className="input-group">
          <input
            type="text"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            className={errors.last_name ? "input-error" : ""}
          />
          {errors.last_name && (
            <span className="error-label">{errors.last_name}</span>
          )}
        </div>

        {/* Email */}
        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className={errors.email ? "input-error" : ""}
          />
          {errors.email && <span className="error-label">{errors.email}</span>}
        </div>

        {/* Password */}
        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className={errors.password ? "input-error" : ""}
          />
          {errors.password && (
            <span className="error-label">{errors.password}</span>
          )}
        </div>

        <Button
          variant="primary"
          type="submit"
          style={{ width: "100%" }}
          disabled={loading}
        >
          {loading ? "Creating..." : "Sign Up"}
        </Button>

        <p
          className="redirect"
          style={{ textAlign: "center", marginTop: "1rem" }}
        >
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
};
