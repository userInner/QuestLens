import {Link, NavLink, Outlet} from "react-router-dom";

import {useChain} from "../hooks/useChain.js";
import {shortAddress} from "../lib/format.js";

export function Layout() {
  const chain = useChain();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">●</span> QuestLens
          <span className="brand-tag">Protocol</span>
        </Link>
        <nav className="topnav">
          <NavLink to="/worker" className={({isActive}) => (isActive ? "active" : "")}>
            Browse tasks
          </NavLink>
          <NavLink to="/worker/me" className={({isActive}) => (isActive ? "active" : "")}>
            My work
          </NavLink>
          <NavLink to="/requester" className={({isActive}) => (isActive ? "active" : "")}>
            Post task
          </NavLink>
          <NavLink to="/requester/me" className={({isActive}) => (isActive ? "active" : "")}>
            My posts
          </NavLink>
        </nav>
        <div className="who">
          <span title={chain.requester.address}>R: {shortAddress(chain.requester.address)}</span>
          <span title={chain.worker.address}>W: {shortAddress(chain.worker.address)}</span>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
      <footer className="footer">
        Injective testnet · Phase 1 (SGX mock) ·{" "}
        <a href="https://github.com" target="_blank" rel="noreferrer">
          source
        </a>
      </footer>
    </div>
  );
}
