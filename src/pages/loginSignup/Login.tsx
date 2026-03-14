import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../api/authService";
import Button from "../../common/components/Button";
import { CgProfile } from "react-icons/cg";
import "./Login.css";

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Global auth context

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    server: ""
  });

  const validate = () => {
    let tempErrors = { email: "", password: "", server: "" };
    let isValid = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      tempErrors.email = "Please enter a valid email address.";
      isValid = false;
    }

    if (password.length < 1) {
      tempErrors.password = "Password is required.";
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
      const msg = err.response?.data?.detail || "Invalid email or password.";
      setErrors(prev => ({ 
        ...prev, 
        server: typeof msg === 'string' ? msg : "Login failed. Check your credentials." 
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="auth-card" noValidate>
        <div className="auth-icon-container" style={{ fontSize: "4rem",display: "flex", justifyContent: "center", color: "black" }}>
          <CgProfile />
        </div>

        <h1 className="Login" style={{ textAlign: "center", marginBottom: "1.5rem" }}>Login</h1>

        {errors.server && <p className="server-error">{errors.server}</p>}

        {/* Email Field */}
        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if(errors.email) setErrors({...errors, email: ""});
            }}
            className={errors.email ? "input-field-error" : ""}
            required
          />
          {errors.email && <span className="error-label">{errors.email}</span>}
        </div>

        {/* Password Field */}
        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if(errors.password) setErrors({...errors, password: ""});
            }}
            className={errors.password ? "input-field-error" : ""}
            required
          />
          {errors.password && <span className="error-label">{errors.password}</span>}
        </div>

        <Button
          variant="primary"
          type="submit"
          style={{ width: "100%" }}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Log In"}
        </Button>

        <hr style={{ margin: "20px 0", border: "0.5px solid #eee" }} />

        <p className="redirect" style={{ textAlign: "center" }}>
          New to ArthaBodh? <Link to="/signup">Create account</Link>
        </p>
      </form>
    </div>
  );
};