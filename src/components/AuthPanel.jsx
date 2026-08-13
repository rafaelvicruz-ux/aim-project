import { useState } from "react";

export function AuthPanel({
  session,
  authForm,
  onAuthFormChange,
  onSignIn,
  onSignUp,
  onSignOut,
  authMessage,
  isConfigured,
}) {
  const [authMode, setAuthMode] = useState("signin");

  if (!isConfigured) {
    return (
      <section className="panel panel--creator">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Supabase Setup</span>
            <h2>Conecte o projeto ao Supabase</h2>
          </div>
        </div>

        <div className="creator-grid">
          <article className="settings-card">
            <p>
              Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` do projeto para ativar
              login e projetos por usuário.
            </p>
            <strong className="creator-id">Arquivo: `.env.example`</strong>
          </article>

          <article className="settings-card">
            <p>
              Depois rode o SQL de `supabase-schema.sql` no painel do Supabase para criar a tabela
              `custom_maps` com segurança por usuário.
            </p>
          </article>
        </div>
      </section>
    );
  }

  if (session?.user) {
    return (
      <section className="panel panel--creator">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Conta</span>
            <h2>Projetos ligados ao seu usuário</h2>
          </div>
          <button className="ghost-button" onClick={onSignOut}>
            Sair
          </button>
        </div>

        <div className="creator-grid">
          <article className="settings-card">
            <span className="eyebrow">Usuário logado</span>
            <strong className="creator-id">{session.user.email}</strong>
            <p>Seus mapas customizados aparecem só nesta conta.</p>
          </article>

          <article className="settings-card">
            <span className="eyebrow">Privacidade</span>
            <p>
              A leitura, criação e exclusão dos mapas customizados agora usa `user_id` no Supabase com
              políticas por usuário.
            </p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="panel panel--creator">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Login</span>
          <h2>Entre para salvar seus projetos</h2>
        </div>
      </div>

      <div className="creator-grid">
        <div className="settings-card auth-card">
          <div className="auth-switch">
            <button
              type="button"
              className={authMode === "signin" ? "pattern-chip pattern-chip--active" : "pattern-chip"}
              onClick={() => setAuthMode("signin")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={authMode === "signup" ? "pattern-chip pattern-chip--active" : "pattern-chip"}
              onClick={() => setAuthMode("signup")}
            >
              Criar conta
            </button>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => onAuthFormChange({ ...authForm, email: event.target.value })}
              placeholder="voce@email.com"
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => onAuthFormChange({ ...authForm, password: event.target.value })}
              placeholder="Sua senha"
            />
          </label>

          <button
            className="primary-button"
            onClick={authMode === "signin" ? onSignIn : onSignUp}
            type="button"
          >
            {authMode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </div>

        <article className="settings-card">
          <span className="eyebrow">Status</span>
          <p>{authMessage || "Entre para criar mapas privados e gerenciar seus projetos."}</p>
        </article>
      </div>
    </section>
  );
}
