import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../api/authService";
import { CgProfile } from "react-icons/cg";
import { BiLoaderAlt } from "react-icons/bi";
import "./Auth.css"; // Ensure this is the optimized CSS file

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Global auth context

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    server: "",
  });

  const validate = () => {
    let tempErrors = { email: "", password: "", server: "" };
    let isValid = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      tempErrors.email = "IDENTIFICATION_ERROR: Invalid email format.";
      isValid = false;
    }

    if (password.length < 1) {
      tempErrors.password = "ACCESS_KEY_REQUIRED: Password cannot be empty.";
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
      const data = await loginService(email, password);
      login(data);
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err.response?.data?.detail || "Access Denied.";
      setErrors((prev) => ({
        ...prev,
        server:
          typeof msg === "string" ? msg : "LOGIN ERROR",
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
            <CgProfile size={40} />
          </div>
          <h2>LOGIN</h2>
          <p>Login to Access</p>
        </header>

        {errors.server && (
          <div
            className="limit-warning"
            style={{
              marginBottom: "1rem",
              border: "1px solid #f85149",
              color: "#f85149",
              background: "rgba(248, 81, 73, 0.1)",
              padding: "8px",
              fontSize: "0.75rem",
              borderRadius: "4px",
            }}
          >
            {errors.server}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email Field */}
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="user@arthabodh.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              className={`auth-input ${errors.email ? "input-error" : ""}`}
              required
            />
            {errors.email && (
              <span className="error-label-mini">{errors.email}</span>
            )}
          </div>

          {/* Password Field */}
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: "" });
              }}
              className={`auth-input ${errors.password ? "input-error" : ""}`}
              required
            />
            {errors.password && (
              <span className="error-label-mini">{errors.password}</span>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <BiLoaderAlt className="spin-icon" />
            ) : (
              "COMPLETE LOGIN"
            )}
          </button>
        </form>

        <div className="auth-footer">
          New User? <Link to="/signup">Create Account</Link>
        </div>
      </div>
    </div>
  );
};
