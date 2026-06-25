/**
 * 퍼플리스 어드민 인증 (Supabase Auth)
 */
(function () {
  'use strict';

  var client = null;

  function getConfig() {
    return window.SUPABASE_CONFIG || {};
  }

  function getClient() {
    var cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    if (!client) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return client;
  }

  async function getSession() {
    var c = getClient();
    if (!c) return null;
    var res = await c.auth.getSession();
    if (res.error) throw res.error;
    return res.data.session;
  }

  async function requireAuth() {
    var session = await getSession();
    if (!session) {
      window.location.href = '/admin-login.html';
      return null;
    }
    return session;
  }

  async function signIn(email, password) {
    var c = getClient();
    if (!c) throw new Error('Supabase가 설정되지 않았습니다.');
    var res = await c.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    var c = getClient();
    if (!c) return;
    await c.auth.signOut();
    window.location.href = '/admin-login.html';
  }

  async function getUserEmail() {
    var session = await getSession();
    return session && session.user ? session.user.email : '';
  }

  window.PurpleAdminAuth = {
    getClient: getClient,
    getSession: getSession,
    requireAuth: requireAuth,
    signIn: signIn,
    signOut: signOut,
    getUserEmail: getUserEmail,
    isConfigured: function () { return !!getClient(); }
  };
})();
