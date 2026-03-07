import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Button from "../../common/components/Button";
import { Link, useNavigate } from "react-router";
import "./Login.css";
import { CgProfile } from "react-icons/cg";

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:8000/auth/login", {
        email: email,
        password: password,
      });

      login(response.data);
      navigate("/dashboard"); // Redirect to dashboard after successful login
    } catch (err: any) {
      const message =
        err.response?.data?.detail?.[0]?.msg ||
        "Login failed. Please check your credentials.";
      alert(message);
      console.error("Axios Auth Error:", err.response?.status, message);
    }
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
          <CgProfile />
        </div>
        <h1 className="Login">Login</h1>
        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button
          className="Button"
          variant="primary"
          type="submit"
          style={{ width: "100%" }}
        >
          Log In
        </Button>

        <hr />
        <button
          type="button"
          onClick={() => {
            //Tell the AuthContext
            login({
              token: "simulated-token",
              user: {
                id: 0,
                email: email || "guest@arthabodh.com",
                first_name: "Guest",
              },
            });
            // redirect
            navigate("/dashboard");
          }}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Simulate Success (Bypass DB)
        </button>

        <p className="redirect">
          Signup? <Link to="/signup">Create account</Link>
        </p>
      </form>
    </div>
  );
};
