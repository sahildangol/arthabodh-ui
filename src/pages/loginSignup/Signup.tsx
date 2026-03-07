import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Button from "../../common/components/Button"; // Matching Login's button usage
import { FaAddressCard } from "react-icons/fa";
import "./Login.css";

export const Signup = () => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    is_verified: false,
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/auth/signup", formData);
      alert("Account created! Please login.");
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      alert("Signup failed. Check console.");
    }
  };

  const simulateSuccess = () => {
    login({
      token: "fake-jwt-token",
      user: {
        id: 1,
        email: formData.email || "demo@arthabodh.com",
        firstName: "Demo",
      },
    });
    navigate("/dashboard");
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="auth-card">
        <div
          style={{
            fontSize: "4rem",
            color: "black",
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <FaAddressCard />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          Create Account
        </h2>

        <div className="input-group">
          <input
            type="text"
            placeholder="First Name"
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            required
          />
        </div>

        <div className="input-group">
          <input
            type="text"
            placeholder="Last Name"
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            required
          />
        </div>

        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
          />
        </div>

        <Button variant="primary" type="submit" style={{ width: "100%" }}>
          Sign Up
        </Button>

        <hr style={{ margin: "20px 0" }} />

        <button
          type="button"
          onClick={simulateSuccess}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Simulate Success (Bypass)
        </button>

        <p className="redirect">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
};
