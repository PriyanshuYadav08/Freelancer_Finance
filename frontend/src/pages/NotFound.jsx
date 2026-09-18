import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, LayoutDashboard, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import "./NotFound.css";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="not-found-page">
      <div className="not-found-card panel">
        <div className="not-found-icon">
          <AlertCircle size={32} />
        </div>
        <div className="not-found-code mono">404</div>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-desc">
          The page or API endpoint you tried to access does not exist or has been moved.
        </p>

        <div className="not-found-actions">
          {user ? (
            <Link to="/" className="btn-primary">
              <LayoutDashboard size={16} />
              <span>Go to Dashboard</span>
            </Link>
          ) : (
            <Link to="/welcome" className="btn-primary">
              <Home size={16} />
              <span>Back to Home</span>
            </Link>
          )}
          <button className="btn-secondary" onClick={() => window.history.back()}>
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
