import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Camera,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle2,
  UploadCloud,
  ArrowRight
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  saveUserProfile,
  getUserProfile,
  logUserActivity,
  signInWithPhone,
  signUpWithPhone,
  findUserByEmail,
  hashPassword,
  getDeviceType,
  cleanPhoneNumber
} from '../services/firebase';
import { compressDeviceImage } from '../services/mediaStorage';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { Language, UserProfile } from '../types';

interface AuthModalProps {
  language: Language;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  language,
  onClose,
  onSuccess
}) => {
  // Mode: login | signup
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Sign Up fields (regular email/phone)
  const [username, setUsername] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
  );
  const [avatarFileChosen, setAvatarFileChosen] = useState(false);

  // Unified Identifier (Email OR Phone Number)
  const [identifier, setIdentifier] = useState('');
  
  // Password & Visibility (Eye Icon)
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // -------------------------------------------------------------
  // Google Auth 2-Step Flows:
  // - google_signup_details: Prompt for name, photo from device, password
  // - google_login_password: Prompt for password of existing account
  // -------------------------------------------------------------
  type GoogleFlowStep = 'idle' | 'google_signup_details' | 'google_login_password';
  const [googleStep, setGoogleStep] = useState<GoogleFlowStep>('idle');
  const [googleCred, setGoogleCred] = useState<{
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  } | null>(null);
  const [googleProfile, setGoogleProfile] = useState<UserProfile | null>(null);

  // Google Signup step fields
  const [googleUsername, setGoogleUsername] = useState('');
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
  );
  const [googleAvatarChosen, setGoogleAvatarChosen] = useState(false);
  const [googlePassword, setGooglePassword] = useState('');
  const [showGooglePassword, setShowGooglePassword] = useState(false);

  // Google Login step fields
  const [googleVerifyPassword, setGoogleVerifyPassword] = useState('');
  const [showGoogleVerifyPassword, setShowGoogleVerifyPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const googleFileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const t = (key: string, fallback = '') => getTranslation(language, key, fallback);

  // Google Sign-In / Sign-Up Trigger
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      showToast(t('openingGoogleAuth', 'جاري فتح نافذة المصادقة عبر Google...'), 'info');
      const cred = await signInWithGoogle();
      
      let existing = await getUserProfile(cred.uid);
      if (!existing && cred.email) {
        existing = await findUserByEmail(cred.email);
      }

      setGoogleCred({
        uid: cred.uid,
        email: cred.email || `${cred.uid}@google.user`,
        displayName: cred.displayName || '',
        photoURL: cred.photoURL || ''
      });

      if (mode === 'signup') {
        if (existing) {
          // Account already exists -> prompt for password to log in
          showToast('هذا الحساب مسجل مسبقاً، يرجى إدخال كلمة المرور لتسجيل الدخول', 'info');
          setGoogleProfile(existing);
          setGoogleVerifyPassword('');
          setGoogleStep('google_login_password');
        } else {
          // New account -> prompt for name, photo from device, password
          setGoogleUsername(cred.displayName || (cred.email ? cred.email.split('@')[0] : ''));
          setGoogleAvatarUrl(
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
          );
          setGoogleAvatarChosen(false);
          setGooglePassword('');
          setGoogleStep('google_signup_details');
        }
      } else {
        // mode === 'login'
        if (existing) {
          setGoogleProfile(existing);
          setGoogleVerifyPassword('');
          setGoogleStep('google_login_password');
        } else {
          showToast('هذا الحساب غير مسجل بعد، يرجى إكمال إنشاء حسابك الجديد', 'info');
          setGoogleUsername(cred.displayName || (cred.email ? cred.email.split('@')[0] : ''));
          setGoogleAvatarUrl(
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
          );
          setGoogleAvatarChosen(false);
          setGooglePassword('');
          setGoogleStep('google_signup_details');
        }
      }
    } catch (err: any) {
      console.warn('Google auth error:', err);
      showToast(err.message || t('googleAuthError', 'فشل تسجيل الدخول باستخدام Google'), 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Complete Google Signup (Name, Device Photo, Password)
  const handleCompleteGoogleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleCred) return;

    const trimmedUsername = googleUsername.trim();
    if (!trimmedUsername) {
      showToast('يرجى إدخال اسم الحساب', 'error');
      return;
    }

    if (!googlePassword || googlePassword.length < 6) {
      showToast('يرجى إدخال كلمة مرور لا تقل عن 6 أحرف', 'error');
      return;
    }

    setLoading(true);
    try {
      const passwordHash = hashPassword(googlePassword);
      const newProfile: UserProfile = {
        uid: googleCred.uid,
        email: googleCred.email,
        username: trimmedUsername,
        avatarUrl: googleAvatarUrl,
        password: googlePassword,
        passwordHash,
        registeredAt: Date.now(),
        lastLoginAt: Date.now(),
        subscribersCount: 0,
        totalViews: 0,
        deviceType: getDeviceType(),
        emailVerified: true,
        provider: 'google',
        isBlocked: false
      };

      await saveUserProfile(newProfile);
      localStorage.removeItem('yassa_phone_user_uid');

      try {
        await logUserActivity(newProfile, 'signup', 'تم إنشاء الحساب عبر Google بنجاح');
      } catch {}

      showToast(`أهلاً بك يا ${newProfile.username}! تم إنشاء حسابك بنجاح 🎉`, 'success');
      onSuccess(newProfile);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء إتمام إنشاء الحساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Verify Google Login Password
  const handleVerifyGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleProfile) return;

    if (!googleVerifyPassword) {
      showToast('يرجى إدخال كلمة المرور', 'error');
      return;
    }

    setLoading(true);
    try {
      const enteredHash = hashPassword(googleVerifyPassword);
      const isMatch =
        (googleProfile.passwordHash && googleProfile.passwordHash === enteredHash) ||
        (googleProfile.password && googleProfile.password === googleVerifyPassword);

      if (!isMatch && (googleProfile.passwordHash || googleProfile.password)) {
        showToast('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى', 'error');
        setLoading(false);
        return;
      }

      const updated: UserProfile = {
        ...googleProfile,
        lastLoginAt: Date.now(),
        emailVerified: true
      };

      await saveUserProfile(updated);
      localStorage.removeItem('yassa_phone_user_uid');

      try {
        await logUserActivity(updated, 'login', 'سجل الدخول بحساب Google');
      } catch {}

      showToast(`مرحباً بك مجدداً يا ${updated.username}! تم تسجيل الدخول بنجاح`, 'success');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تسجيل الدخول', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google avatar upload from device
  const handleGoogleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast(t('avatarProcessing', 'جاري معالجة الصورة من جهازك...'), 'info');
      const compressed = await compressDeviceImage(file, 300, 300, 0.88);
      setGoogleAvatarUrl(compressed);
      setGoogleAvatarChosen(true);
      showToast(t('avatarProcessedSuccess', 'تم اختيار الصورة الشخصية بنجاح من جهازك'), 'success');
    } catch (err: any) {
      showToast(err.message || t('avatarError', 'فشل في تحميل الصورة من الجهاز'), 'error');
    }
  };

  // Detect whether the input is an email (contains @) or a phone number
  const isEmailInput = identifier.includes('@');

  // Handle avatar upload strictly from device
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast(t('avatarProcessing', 'جاري معالجة الصورة من جهازك...'), 'info');
      const compressed = await compressDeviceImage(file, 300, 300, 0.88);
      setAvatarDataUrl(compressed);
      setAvatarFileChosen(true);
      showToast(t('avatarProcessedSuccess', 'تم اختيار الصورة الشخصية بنجاح من جهازك'), 'success');
    } catch (err: any) {
      showToast(err.message || t('avatarError', 'فشل في تحميل الصورة من الجهاز'), 'error');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanInput = identifier.trim();

    try {
      // -------------------------------------------------------------
      // 1. SIGN IN (تسجيل الدخول)
      // -------------------------------------------------------------
      if (mode === 'login') {
        if (!cleanInput) {
          showToast(t('enterEmailOrPhoneError', 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل به'), 'error');
          setLoading(false);
          return;
        }

        if (!password) {
          showToast(t('enterPasswordError', 'يرجى إدخال كلمة المرور'), 'error');
          setLoading(false);
          return;
        }

        if (isEmailInput) {
          // --- Sign in with Email ---
          const cleanMail = cleanInput.toLowerCase();
          try {
            const cred = await signInWithEmail(cleanMail, password);
            let userProfile = await getUserProfile(cred.uid);

            if (!userProfile) {
              userProfile = {
                uid: cred.uid,
                email: cred.email || cleanMail,
                username: cred.displayName || cleanMail.split('@')[0],
                avatarUrl: cred.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
                registeredAt: Date.now(),
                lastLoginAt: Date.now(),
                subscribersCount: 0,
                totalViews: 0,
                deviceType: getDeviceType(),
                emailVerified: true,
                provider: 'email',
                isBlocked: false
              };
              await saveUserProfile(userProfile);
            } else {
              userProfile = {
                ...userProfile,
                lastLoginAt: Date.now(),
                emailVerified: true
              };
              await saveUserProfile(userProfile);
            }

            localStorage.removeItem('yassa_phone_user_uid');

            try {
              await logUserActivity(userProfile, 'login', 'سجل الدخول بالبريد الإلكتروني');
            } catch {}

            showToast(`${t('welcomeBack', 'مرحباً بك مجدداً يا')} ${userProfile.username}! ${t('loginSuccess', 'تم تسجيل الدخول بنجاح')}`, 'success');
            onSuccess(userProfile);
            onClose();
          } catch (emailErr: any) {
            // Fallback check database for custom stored accounts
            const dbUser = await findUserByEmail(cleanMail);
            if (dbUser && dbUser.passwordHash === hashPassword(password)) {
              const updated: UserProfile = {
                ...dbUser,
                lastLoginAt: Date.now(),
                emailVerified: true
              };
              await saveUserProfile(updated);
              localStorage.setItem('yassa_phone_user_uid', updated.uid);
              showToast(`${t('welcomeBack', 'مرحباً بك مجدداً يا')} ${updated.username}!`, 'success');
              onSuccess(updated);
              onClose();
            } else {
              throw emailErr;
            }
          }
        } else {
          // --- Sign in with Phone Number ---
          const phoneClean = cleanPhoneNumber(cleanInput);
          const userProfile = await signInWithPhone(phoneClean, password);

          localStorage.setItem('yassa_phone_user_uid', userProfile.uid);

          try {
            await logUserActivity(userProfile, 'login', 'سجل الدخول برقم الهاتف');
          } catch {}

          showToast(`${t('welcomeBack', 'مرحباً بك مجدداً يا')} ${userProfile.username}! ${t('loginSuccess', 'تم تسجيل الدخول بنجاح')}`, 'success');
          onSuccess(userProfile);
          onClose();
        }
      }

      // -------------------------------------------------------------
      // 2. SIGN UP (إنشاء حساب جديد)
      // -------------------------------------------------------------
      if (mode === 'signup') {
        if (!username.trim()) {
          showToast(t('enterUsernameError', 'يرجى كتابة اسم الحساب'), 'error');
          setLoading(false);
          return;
        }

        if (!cleanInput) {
          showToast(t('enterSignupIdentifierError', 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف للإنشاء'), 'error');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          showToast(t('passwordMinLengthError', 'يجب ألا تقل كلمة المرور عن 6 خانات'), 'error');
          setLoading(false);
          return;
        }

        if (isEmailInput) {
          // Email Registration
          const cleanMail = cleanInput.toLowerCase();
          const cred = await signUpWithEmail(cleanMail, password, username.trim(), avatarDataUrl);

          const profile: UserProfile = {
            uid: cred.uid,
            email: cleanMail,
            username: username.trim(),
            avatarUrl: avatarDataUrl,
            registeredAt: Date.now(),
            lastLoginAt: Date.now(),
            subscribersCount: 0,
            totalViews: 0,
            deviceType: getDeviceType(),
            emailVerified: true,
            phoneVerified: false,
            provider: 'email',
            isBlocked: false
          };

          await saveUserProfile(profile);
          localStorage.removeItem('yassa_phone_user_uid');

          try {
            await logUserActivity(profile, 'signup', 'تم إنشاء الحساب بنجاح عبر البريد الإلكتروني');
          } catch {}

          showToast(`${t('welcomeBack', 'أهلاً بك يا')} ${profile.username}! ${t('signupSuccess', 'تم إنشاء حسابك وتسجيل دخولك بنجاح 🎉')}`, 'success');
          onSuccess(profile);
          onClose();
        } else {
          // Phone Number Registration
          const phoneClean = cleanPhoneNumber(cleanInput);
          if (!phoneClean || phoneClean.length < 8) {
            showToast(t('validPhoneError', 'يرجى إدخال رقم هاتف صحيح متضمناً مفتاح الدولة'), 'error');
            setLoading(false);
            return;
          }

          const { uid, phone: validPhone, passwordHash } = await signUpWithPhone(phoneClean, password);

          const profile: UserProfile = {
            uid,
            email: `${validPhone}@phone.neuroyobe`,
            phoneNumber: validPhone,
            username: username.trim(),
            avatarUrl: avatarDataUrl,
            registeredAt: Date.now(),
            lastLoginAt: Date.now(),
            subscribersCount: 0,
            totalViews: 0,
            deviceType: getDeviceType(),
            phoneVerified: true,
            emailVerified: true,
            provider: 'phone',
            isBlocked: false,
            passwordHash
          };

          await saveUserProfile(profile);
          localStorage.setItem('yassa_phone_user_uid', profile.uid);

          try {
            await logUserActivity(profile, 'signup', 'تم إنشاء الحساب بنجاح عبر رقم الهاتف');
          } catch {}

          showToast(`${t('welcomeBack', 'أهلاً بك يا')} ${profile.username}! ${t('signupSuccess', 'تم إنشاء حسابك وتسجيل دخولك بنجاح 🎉')}`, 'success');
          onSuccess(profile);
          onClose();
        }
      }
    } catch (err: any) {
      console.warn('Auth submit error:', err);
      showToast(err.message || t('authGeneralError', 'حدث خطأ، يرجى التأكد من البيانات والمحاولة مجدداً'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="auth-modal-container"
        className="relative w-full max-w-md bg-[#080d1a] border border-cyan-900/60 rounded-3xl p-5 sm:p-7 text-slate-100 shadow-2xl shadow-cyan-950/60 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Glow ambient effects */}
        <div className="absolute -top-16 -end-16 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -start-16 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="auth-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/60 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =========================================================================
            VIEW A: Google Sign-Up Step 2 (اسم الحساب + صورة من الجهاز + كلمة المرور)
           ========================================================================= */}
        {googleStep === 'google_signup_details' && (
          <div className="flex flex-col flex-1 overflow-y-auto pe-1">
            <button
              type="button"
              onClick={() => setGoogleStep('idle')}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 mb-3 cursor-pointer self-start"
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
              <span>العودة للخيارات السابقة</span>
            </button>

            <div className="text-center mb-4 shrink-0">
              <div className="inline-flex p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 mb-2 shadow-inner">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-100">إكمال إنشاء حسابك عبر Google</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs mt-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{googleCred?.email}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                اختر اسم حسابك وصورة شخصية من جهازك وكلمة المرور لإتمام التسجيل
              </p>
            </div>

            <form onSubmit={handleCompleteGoogleSignup} className="space-y-4 flex-1">
              {/* صورة الحساب من الجهاز */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#040813]/70 border border-cyan-950/60">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => googleFileInputRef.current?.click()}
                  title="انقر لاختيار صورة من جهازك"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-lg shadow-cyan-950/80 bg-slate-900 flex items-center justify-center">
                    <img
                      src={googleAvatarUrl}
                      alt="صورة الحساب"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-cyan-300" />
                    <span className="text-[9px] font-bold text-cyan-200 mt-0.5">صورة من الجهاز</span>
                  </div>
                  {googleAvatarChosen && (
                    <div className="absolute -bottom-1 -end-1 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <input
                  ref={googleFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGoogleAvatarFileChange}
                  className="hidden"
                />
                <span className="text-[11px] text-slate-400 mt-2">
                  {googleAvatarChosen ? 'تم تحديد صورة من جهازك بنجاح' : 'انقر لاختيار صورة مخصصة من جهازك'}
                </span>
              </div>

              {/* اسم الحساب */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم الحساب أو القناة <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-cyan-400 absolute start-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: ياسة تيوب أو اسمك الكامل"
                    value={googleUsername}
                    onChange={(e) => setGoogleUsername(e.target.value)}
                    className="w-full bg-[#040813] border border-cyan-950 focus:border-cyan-400 rounded-xl py-2.5 ps-9 pe-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كلمة المرور للحساب <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-cyan-400 absolute start-3 pointer-events-none" />
                  <input
                    type={showGooglePassword ? 'text' : 'password'}
                    required
                    placeholder="اختر كلمة مرور لحسابك (6 أحرف فأكثر)"
                    value={googlePassword}
                    onChange={(e) => setGooglePassword(e.target.value)}
                    className="w-full bg-[#040813] border border-cyan-950 focus:border-cyan-400 rounded-xl py-2.5 ps-9 pe-10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGooglePassword(!showGooglePassword)}
                    className="absolute end-3 text-slate-400 hover:text-cyan-300 p-1 focus:outline-none cursor-pointer"
                  >
                    {showGooglePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* زر إتمام التسجيل */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-950/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>إتمام إنشاء الحساب والدخول</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            VIEW B: Google Login Step 2 (طلب كلمة المرور الخاصة بالحساب المسجل)
           ========================================================================= */}
        {googleStep === 'google_login_password' && (
          <div className="flex flex-col flex-1 overflow-y-auto pe-1">
            <button
              type="button"
              onClick={() => setGoogleStep('idle')}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 mb-3 cursor-pointer self-start"
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
              <span>العودة للخيارات السابقة</span>
            </button>

            <div className="text-center mb-5 shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400/80 mx-auto mb-2 shadow-lg bg-slate-900">
                <img
                  src={
                    googleProfile?.avatarUrl ||
                    googleCred?.photoURL ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-base font-black text-slate-100">
                مرحباً بك {googleProfile?.username || googleCred?.displayName}!
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-xs mt-1.5 font-medium">
                <Mail className="w-3.5 h-3.5" />
                <span>{googleProfile?.email || googleCred?.email}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                يرجى إدخال كلمة المرور الخاصة بحسابك لإتمام تسجيل الدخول
              </p>
            </div>

            <form onSubmit={handleVerifyGoogleLogin} className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كلمة مرور الحساب <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-cyan-400 absolute start-3 pointer-events-none" />
                  <input
                    type={showGoogleVerifyPassword ? 'text' : 'password'}
                    required
                    placeholder="أدخل كلمة مرور حسابك"
                    value={googleVerifyPassword}
                    onChange={(e) => setGoogleVerifyPassword(e.target.value)}
                    className="w-full bg-[#040813] border border-cyan-950 focus:border-cyan-400 rounded-xl py-2.5 ps-9 pe-10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleVerifyPassword(!showGoogleVerifyPassword)}
                    className="absolute end-3 text-slate-400 hover:text-cyan-300 p-1 focus:outline-none cursor-pointer"
                  >
                    {showGoogleVerifyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-950/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تأكيد تسجيل الدخول</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            VIEW C: Standard Identifier & Password Form + Google Auth Button
           ========================================================================= */}
        {googleStep === 'idle' && (
          <>
            {/* Header Icon & Title */}
            <div className="text-center mb-4 shrink-0">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 mb-2 shadow-inner">
                {mode === 'login' ? (
                  <LogIn className="w-6 h-6" />
                ) : (
                  <UserPlus className="w-6 h-6" />
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100">
                {mode === 'login' ? t('loginTitle', 'تسجيل الدخول') : t('signupTitle', 'إنشاء حساب')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? t('loginSubtitle', 'سجل دخولك بالبريد الإلكتروني أو رقم الهاتف الذي سبق التسجيل به')
                  : t('signupSubtitle', 'أنشئ حسابك الجديد بسهولة للبدء في التفاعل والنشر')}
              </p>
            </div>

        {/* Tabs: Sign In / Sign Up */}
        <div className="flex bg-[#040813] p-1 rounded-2xl border border-cyan-950/80 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('loginTitle', 'تسجيل الدخول')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('signupTitle', 'إنشاء حساب')}</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto pe-1 flex-1">
          {/* =========================================================================
              SIGN UP ONLY: رفع صورة حساب من الجهاز + اسم الحساب
             ========================================================================= */}
          {mode === 'signup' && (
            <>
              {/* 1. رفع صورة حساب من الجهاز */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#040813]/70 border border-cyan-950/60">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-lg shadow-cyan-950/80 bg-slate-900 flex items-center justify-center">
                    <img
                      src={avatarDataUrl}
                      alt={t('accountName', 'صورة الحساب')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-cyan-300" />
                    <span className="text-[9px] font-bold text-cyan-200 mt-0.5">{t('upload', 'رفع صورة')}</span>
                  </div>
                  {avatarFileChosen && (
                    <div className="absolute -bottom-1 -end-1 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/40 rounded-full text-[11px] font-semibold text-cyan-300 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{avatarFileChosen ? t('changeAvatarDevice', 'تغيير صورة الحساب من الجهاز') : t('uploadAvatarDevice', 'رفع صورة حساب من الجهاز')}</span>
                </button>
              </div>

              {/* 2. اسم الحساب */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('accountName', 'اسم الحساب')}</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('accountNamePlaceholder', 'مثال: أحمد محمد / قناة المعرفة')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#040813] border border-cyan-950 focus:border-cyan-400 rounded-xl py-2.5 px-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* =========================================================================
              البريد الإلكتروني أو رقم الهاتف
             ========================================================================= */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {isEmailInput ? (
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>
                  {mode === 'login'
                    ? t('emailOrPhoneLogin', 'البريد الإلكتروني أو رقم الهاتف الذي سبق التسجيل به')
                    : t('emailOrPhoneSignup', 'البريد الإلكتروني أو رقم الهاتف للانشاء')}
                </span>
                <span className="text-rose-400">*</span>
              </span>
              <span className="text-[10px] text-cyan-400/80 font-normal">
                {isEmailInput ? t('emailType', 'بريد إلكتروني') : t('phoneType', 'رقم هاتف')}
              </span>
            </label>
            <div className="relative flex items-center">
              {isEmailInput ? (
                <Mail className="w-4 h-4 text-cyan-400 absolute start-3 pointer-events-none" />
              ) : (
                <Smartphone className="w-4 h-4 text-cyan-400 absolute start-3 pointer-events-none" />
              )}
              <input
                type="text"
                required
                placeholder={
                  mode === 'login'
                    ? t('emailOrPhonePlaceholderLogin', 'user@example.com أو 0501234567')
                    : t('emailOrPhonePlaceholderSignup', 'user@example.com أو 966501234567')
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                dir="ltr"
                className="w-full bg-[#040813] border border-cyan-950 focus:border-cyan-400 rounded-xl py-2.5 ps-9 pe-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none text-start font-mono"
              />
            </div>
          </div>

          {/* =========================================================================
              كلمة المرور مع رمز عين (إظهار وإخفاء)
             ========================================================================= */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{mode === 'login' ? t('password', 'كلمة المرور') : t('passwordOnly', 'كلمة المرور فقط')}</span>
              <span className="text-rose-400">*</span>
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-cyan-400 absolute start-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={t('passwordPlaceholder', 'أدخل كلمة المرور')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#040813] border border-cyan-950 focus:border-cyan-400 rounded-xl py-2.5 ps-9 pe-10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 text-slate-400 hover:text-cyan-300 p-1 focus:outline-none"
                title={showPassword ? t('hidePassword', 'إخفاء كلمة المرور') : t('showPassword', 'إظهار كلمة المرور')}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* زر التأكيد (تسجيل الدخول / إنشاء حساب) */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-950/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>{t('loginTitle', 'تسجيل الدخول')}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{t('startNowBtn', 'إنشاء حساب والبدء فوراً')}</span>
              </>
            )}
          </button>

          {/* فاصل أو */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cyan-950/80" />
            </div>
            <div className="relative bg-[#080d1a] px-3 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              {t('orContinueWith', 'أو الاستمرار عبر')}
            </div>
          </div>

          {/* زر Google الذكي: إنشاء حساب عبر Google أو تسجيل الدخول عبر Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading || googleLoading}
            className="w-full py-2.5 px-4 bg-[#050a14] hover:bg-[#0a1224] border border-cyan-900/60 hover:border-cyan-500/60 text-slate-200 hover:text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer group"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>
                  {mode === 'signup'
                    ? 'إنشاء حساب باستخدام Google'
                    : 'تسجيل الدخول باستخدام Google'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle Switch */}
        <div className="mt-4 pt-3 border-t border-cyan-950/60 text-center shrink-0">
          {mode === 'login' ? (
            <p className="text-xs text-slate-400">
              {t('noAccountYet', 'ليس لديك حساب بعد؟')}{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                {t('createNewAccount', 'إنشاء حساب جديد')}
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              {t('alreadyHaveAccount', 'لديك حساب بالفعل؟')}{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                {t('signInPrompt', 'تسجيل الدخول')}
              </button>
            </p>
          )}
        </div>
        </>
      )}
      </div>
    </div>
  );
};
