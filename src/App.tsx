import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import NavbarTop from "./components/NavbarTop";
import LoginPage from "./pages/LoginPage";
import ProductsPage from "./pages/ProductsPage";
import ProfilePage from "./pages/ProfilePage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminAlertsPage from "./pages/AdminAlertsPage";
import AdminPromotionsPage from "./pages/AdminPromotionsPage";
import AdminProductCreatePage from "./pages/AdminProductCreatePage";
import AdminProductEditPage from "./pages/AdminProductEditPage";
import { getRole, hasGuestAccess, isLoggedIn } from "./auth/auth.store";
import RequireAdmin from "./auth/RequireAdmin";

function AppInner() {
  const loc = useLocation();
  const hideNavbar = loc.pathname === "/login";

  const [, force] = useState(0);
  useEffect(() => {
    const on = () => force((x) => x + 1);
    window.addEventListener("auth_changed", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("auth_changed", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const logged = isLoggedIn();
  const role = getRole();
  const guest = hasGuestAccess();

  const canBrowseCatalog = logged || guest;
  const isUser = logged && role === "USER";

  return (
    <>
      {!hideNavbar && <NavbarTop />}

      <Routes>
        {/* ✅ L'app parte SEMPRE dal login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ✅ login: se sei loggato vai al catalogo, altrimenti resta qui */}
        <Route path="/login" element={logged ? <Navigate to="/products" replace /> : <LoginPage />} />

        {/* ✅ catalogo: SOLO se loggato o guest */}
        <Route path="/products" element={canBrowseCatalog ? <ProductsPage /> : <Navigate to="/login" replace />} />

        {/* ✅ area personale SOLO USER loggato (no guest, no admin) */}
        <Route path="/profile" element={isUser ? <ProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="/me/orders" element={isUser ? <MyOrdersPage /> : <Navigate to="/login" replace />} />

        {/* ✅ admin */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Navigate to="/admin/products" replace />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <RequireAdmin>
              <AdminOrdersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/products"
          element={
            <RequireAdmin>
              <AdminProductsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <RequireAdmin>
              <AdminProductCreatePage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/products/:id/edit"
          element={
            <RequireAdmin>
              <AdminProductEditPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/alerts"
          element={
            <RequireAdmin>
              <AdminAlertsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/promotions"
          element={
            <RequireAdmin>
              <AdminPromotionsPage />
            </RequireAdmin>
          }
        />

        {/* ✅ super rigido: qualsiasi route sconosciuta -> login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
