import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import LandingHeader from "../../landing/LandingHeader";
import Footer from "../../landing/Footer";

export default function RegistrationSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const orgName = location.state?.organizationName;

  useEffect(() => {
    if (!orgName) {
      navigate("/register", { replace: true });
    }
  }, [orgName, navigate]);

  if (!orgName) return null;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "linear-gradient(135deg, #fff7f0 0%, #ffffff 50%, #f0f4ff 100%)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <LandingHeader />
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px"
      }}>
        <div style={{ width: "100%", maxWidth: "480px", textAlign: "center" }}>
          <div style={{
            background: "white", borderRadius: "20px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
            border: "1px solid #F3F4F6", padding: "48px 36px"
          }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "#F0FDF4", border: "2px solid #BBF7D0",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <CheckCircle size={36} color="#16A34A" />
            </div>

            <h1 style={{
              fontSize: "24px", fontWeight: "800", color: "#111827",
              margin: "0 0 8px 0", letterSpacing: "-0.5px"
            }}>
              Registration Successful!
            </h1>

            <p style={{ fontSize: "14px", color: "#6B7280", margin: "0 0 4px 0" }}>
              Your organization has been registered successfully.
            </p>

            <p style={{ fontSize: "15px", color: "#111827", fontWeight: "600", margin: "0 0 28px 0" }}>
              {orgName}
            </p>

            <div style={{
              background: "#FFF7F0", borderRadius: "12px",
              border: "1px solid #FFEDD5", padding: "14px 16px",
              marginBottom: "28px"
            }}>
              <p style={{ fontSize: "13px", color: "#9A3412", margin: 0 }}>
                Your account is pending Super Admin approval. You will receive an email once approved.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Link
                to="/login"
                style={{
                  display: "block", width: "100%", padding: "13px", borderRadius: "10px",
                  border: "none", fontSize: "15px", fontWeight: "700",
                  color: "white", textDecoration: "none", textAlign: "center",
                  background: "linear-gradient(135deg, #FF6B00, #FF8C38)",
                  boxShadow: "0 6px 20px rgba(255,107,0,0.35)",
                  boxSizing: "border-box"
                }}
              >
                Go to Login
              </Link>

              <Link
                to="/register"
                style={{
                  display: "block", width: "100%", padding: "13px", borderRadius: "10px",
                  border: "1.5px solid #E5E7EB", fontSize: "15px", fontWeight: "600",
                  color: "#374151", textDecoration: "none", textAlign: "center",
                  background: "#F9FAFB", boxSizing: "border-box",
                  transition: "border-color 0.2s"
                }}
              >
                Register Another Organization
              </Link>
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: "20px" }}>
            <Link to="/" style={{ fontSize: "13px", color: "#9CA3AF", textDecoration: "none" }}>
              ← Back to homepage
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
