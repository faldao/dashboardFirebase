import { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { subscribePrompts } from "./store";
import Icon from "./Icons";
import "./studio.css";

const StudioContext = createContext(null);
export const useStudio = () => useContext(StudioContext);
export function StudioProvider({ children }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limited, setLimited] = useState(false);
  const [refresh, setRefresh] = useState(0),
    [toast, setToast] = useState("");
  useEffect(() => {
    setLoading(true);
    setError("");
    setLimited(false);
    return subscribePrompts(
      (records, partial) => {
        setPrompts(records);
        setLimited(partial);
        setLoading(false);
        setError("");
      },
      (failure) => {
        setLoading(false);
        setError(
          failure.code === "permission-denied"
            ? "La sesión no tiene permiso para leer esta colección en Firebase."
            : failure.message,
        );
      },
    );
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <StudioContext.Provider
      value={{
        prompts,
        loading,
        error,
        limited,
        reload: () => setRefresh((value) => value + 1),
        notify: setToast,
      }}
    >
      {children}
      {toast && (
        <div className="studio-toast" role="status">
          <Icon name="check" />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </StudioContext.Provider>
  );
}

export function PromptReadNotice() {
  const { error, limited, reload } = useStudio();
  if (!error && !limited) return null;
  return (
    <div className="studio-alert" role="alert">
      <div>
        <strong>
          {error
            ? "No pudimos cargar todos los datos"
            : "Listado parcial de prompts"}
        </strong>
        <p>
          {error ||
            "Firebase permite leer documentos individuales, pero restringe el listado. Podés abrir otros prompts por su ID."}
        </p>
      </div>
      <button className="studio-button secondary" onClick={reload}>
        <Icon name="refresh" size={15} />
        Reintentar
      </button>
    </div>
  );
}

export function EmptyState({ icon = "prompt", title, children, action }) {
  return (
    <div className="studio-empty">
      <span className="studio-empty-icon">
        <Icon name={icon} size={27} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const listener = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  return (
    <div
      className="studio-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="studio-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="studio-modal-heading">
          <h2>{title}</h2>
          <button
            className="studio-icon-button"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function downloadJson(value, filename) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
export const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sin fecha registrada";

function Shell() {
  const { prompts, loading, error, limited } = useStudio();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(false);
  const title = location.pathname === "/whatsapp" ? "WhatsApp" : "Biblioteca de prompts";
  const nav = [
    {
      to: "/prompts",
      label: "Prompts",
      icon: "prompt",
      count: prompts.filter((item) => !item._studio?.deleted).length,
    },
    { to: "/whatsapp", label: "WhatsApp", icon: "chat" },
  ];
  return (
    <div className="studio-app">
      <aside className={`studio-sidebar ${menu ? "is-open" : ""}`}>
        <Link to="/prompts" className="studio-brand">
          <span className="studio-brand-symbol">
            v<span>·</span>
          </span>
          <span>
            viproomer<small>AGENT STUDIO</small>
          </span>
        </Link>
        <div className="studio-workspace">
          <span className="studio-workspace-mark">V</span>
          <div>
            Editor de prompts<small>Workspace de desarrollo</small>
          </div>
          <span className="studio-workspace-chevron">⌄</span>
        </div>
        <p className="studio-nav-label">WORKSPACE</p>
        <nav aria-label="Navegación principal">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                `studio-nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.count != null && (
                <small>{loading ? "—" : item.count}</small>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="studio-sidebar-bottom">
          <span className="studio-avatar">DEV</span>
          <div>
            Entorno de desarrollo<small>Viproomer Studio</small>
          </div>
          <span className="studio-online-dot" />
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <div className="studio-breadcrumb">
            <button
              className="studio-menu-button"
              aria-label="Abrir navegación"
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{title}</strong>
          </div>
          <div className="studio-topbar-actions">
            <form
              className="studio-global-search"
              onSubmit={(event) => {
                event.preventDefault();
                window.location.href = `/prompts?q=${encodeURIComponent(search)}`;
              }}
            >
              <Icon name="search" size={16} />
              <input
                aria-label="Buscar prompts"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar un prompt…"
              />
              <kbd>↵</kbd>
            </form>
            <span
              className={`studio-connection ${error || limited ? "partial" : ""}`}
            >
              <i />
              {loading
                ? "Conectando"
                : error || limited
                  ? "Conexión parcial"
                  : "Firebase conectado"}
            </span>
          </div>
        </header>
        <main className="studio-content">
          <Outlet />
        </main>
        <footer className="studio-main-footer">
          <span>Viproomer Agent Studio</span>
        </footer>
      </div>
    </div>
  );
}

export default function StudioShell() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}
