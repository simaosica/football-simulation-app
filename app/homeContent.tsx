// app/homeContent.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { signIn, useSession } from "next-auth/react";
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage, languageFlags } from './i18n/languageContext';
import Modal from './components/modal/modal';
import modalStyles from './components/modal/modal.module.css';

type AuthMode = 'login' | 'register';

// Validation functions
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password: string) => password.length >= 8 && password.length <= 12;

export default function HomeContent() {
  const { lang, toggleLanguage, t, ready } = useLanguage();
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const isRegister = mode === 'register';
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const [registerError, setRegisterError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = isRegister ? isValidEmail(email) && isValidPassword(password) && password === confirmPassword : isValidEmail(email) && isValidPassword(password);

  const resetAuthForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');

    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmTouched(false);
  
    setRegisterError(null);
    setAuthError(null);
    setSuccessMessage(null);
  
    setMode('login');
  };  

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);

    setPassword('');
    setConfirmPassword('');
    
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmTouched(false);

    setRegisterError(null);
    setAuthError(null);
    setSuccessMessage(null);
  };

  const handleCredentialsLogin = async () => {
    if (loading) return;
    setLoading(true);
    setAuthError(null);

    const callbackUrl = searchParams.get("callbackUrl") ?? "/start";
    const lowerEmail = email.trim().toLowerCase();
  
    const result = await signIn("credentials", {
      email: lowerEmail,
      password,
      redirect: false,
      callbackUrl
    });
  
    if (result?.error) {
      setLoading(false);
      switch (result.error) {
        case "USER_NOT_FOUND":
          setAuthError(t.userNotFound);
          break;
        case "OAUTH_ACCOUNT":
          setAuthError(t.oAuthAccount);
          break;
        case "INVALID_PASSWORD":
          setAuthError(t.incorrectPassword);
          break;
        case "EMAIL_NOT_VERIFIED":
          setAuthError(t.emailNotVerified);
          break;          
        default:
          setAuthError(t.loginError);
      }
      return;
    }
  
    router.push(callbackUrl);
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
  
    const callbackUrl = searchParams.get("callbackUrl") ?? "/start";
  
    await signIn("google", { callbackUrl });
  };  

  const handleRegister = async () => {
    if (loading) return;
    setLoading(true);
    setRegisterError(null);
  
    const lowerEmail = email.trim().toLowerCase();
  
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: lowerEmail,
          password,
        }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        setLoading(false);
        switch (data.error) {
          case "OAUTH_ACCOUNT":
            setRegisterError(t.oAuthAccount);
            break;
          case "User already exists":
            setRegisterError(t.userAlreadyExists);
            break;
          default:
            setRegisterError(data.error || t.registrationFailed);
        }
        return;
      }
  
      // SUCCESS FLOW
      setLoading(false);
      switchMode("login");
      setSuccessMessage(t.registerSuccessMessage);
      setTimeout(() => {setSuccessMessage(null)}, 5000); // Hide message after 5 seconds
  
    } catch (error) {
      setLoading(false);
      console.error("Registration error:", error);
      setRegisterError(t.registrationFailed);
    }
  };  

  // Check for callbackUrl on mount to auto-open login modal
  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl) {
      resetAuthForm();
      setLoginOpen(true);
    }
  }, [searchParams]);

  // Redirect authenticated users to the start page
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/start");
    }
  }, [status, router]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!loginOpen) resetAuthForm();
  }, [loginOpen]);

  // Check for email verification status
  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "true") {
      resetAuthForm();
      setLoginOpen(true);
      setSuccessMessage(t.accountVerified);
      setTimeout(() => {setSuccessMessage(null)}, 5000); // Hide message after 5 seconds
    }
  }, [searchParams, t.accountVerified]);

  if (!ready || status === "loading") return null;

  return (
    <div className="main-menu">
      <button className="lang-btn" onClick={toggleLanguage}>
        {lang.toUpperCase()} {languageFlags[lang]}
      </button>

      <h1 className="menu-title">FOOTBALL SIMULATION</h1>
      <Image src="/football.png" alt="Football Icon" width={100} height={100} className="menu-icon" />

      <button className="menu-btn"
        onClick={() => {
          resetAuthForm();
          setLoginOpen(true);
        }}
      >
        {t.start}
      </button>


      <Modal open={loginOpen}>
      <div className={modalStyles.modalTitle}>{isRegister ? t.createAccount : t.login}</div>

        <div className={modalStyles.inputWrapper}>
          <div className={modalStyles.inputRow}>
            <span className={modalStyles.inputIcon}>✉️</span>
            <input type="email" className={modalStyles.modalCredentialsInput} placeholder={t.email} value={email}
              onChange={(e) => {
                const value = e.target.value.toLowerCase();
                setEmail(value);
                setEmailTouched(true);
              }}
            />
          </div>
          {isRegister && emailTouched && email.length > 0 && !isValidEmail(email) &&(
            <p className={modalStyles.errorText}>{t.emailError}</p>
          )}
        </div>


        <div className={modalStyles.inputWrapper}>
          <div className={modalStyles.inputRow}>
            <span className={modalStyles.inputIcon}>🔒</span>
            <input type="password" className={modalStyles.modalCredentialsInput} placeholder={t.password} value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                setPasswordTouched(true);
              }}
            />
        </div>
          {isRegister && passwordTouched && password.length > 0 && !isValidPassword(password) && (
            <p className={modalStyles.errorText}>{t.passwordLengthError}</p>
          )}
        </div>

        {isRegister && (
          <div className={modalStyles.inputWrapper}>
            <div className={modalStyles.inputRow}>
              <span className={modalStyles.inputIcon}>🔒</span>
              <input type="password" className={modalStyles.modalCredentialsInput} placeholder={t.confirmPassword} value={confirmPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setConfirmPassword(value);
                  setConfirmTouched(true);
                }}
              />
            </div>
            {confirmTouched && confirmPassword.length > 0 && password !== confirmPassword && (
              <p className={modalStyles.errorText}>{t.confirmPasswordError}</p>
            )}
          </div>
        )}

        {registerError && isRegister && (
          <p className={modalStyles.errorText}>
            {registerError}
          </p>
        )}

        {authError && !isRegister && (
          <p className={modalStyles.errorText}>
            {authError}
          </p>
        )}

        {successMessage && (
          <p className={modalStyles.successText}>
            {successMessage}
          </p>
        )}

        <p className={modalStyles.authSwitchText}>
          {isRegister ? (
            <>
              {t.alreadyHaveAccount}{' '}
              <span className={modalStyles.authSwitchLink} onClick={() => switchMode('login')}>
                {t.login}
              </span>
            </>
          ) : (
            <>
              {t.dontHaveAccount}{' '}
              <span className={modalStyles.authSwitchLink} onClick={() => switchMode('register')}>
                {t.register}
              </span>
            </>
          )}
        </p>

        <div className={modalStyles.modalActions}>
          <button className={modalStyles.cancelButton}
            onClick={() => {
              resetAuthForm();
              setLoginOpen(false)
            }}
            >
            {t.cancel}
          </button>

          <button className={modalStyles.confirmButtonSave} disabled={!canSubmit || loading}
            onClick={() => {
              if (isRegister) handleRegister();
              else handleCredentialsLogin();
            }}
          >
            {isRegister ? t.register : t.submit}
          </button>
        </div>

        <div className={modalStyles.loginDivider}>{t.orContinueWith}</div>

        <div className={modalStyles.modalActions}>
          <button className={modalStyles.googleButton} onClick={handleGoogleLogin} disabled={loading}>
            <Image src="/google-icon.svg" alt="Google" width={20} height={20}/>
            GOOGLE
          </button>
        </div>
      </Modal>
    </div>
  );
}