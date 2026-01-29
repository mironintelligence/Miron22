import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("authUser"));
    if (!user) navigate("/login");
  }, [navigate]);

  return <div>Admin Panel - {JSON.parse(localStorage.getItem("authUser"))?.firstName}</div>;
}
