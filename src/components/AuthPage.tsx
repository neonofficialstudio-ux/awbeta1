import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { useAppContext } from '../constants';
import { login, register } from '../api/users';
import { ShieldIcon, CheckIcon } from '../constants';

interface AuthPageProps {
  termsContent: string;
}

// Custom Animated Equalizer Icon for the Header
const NeonEqualizerIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`flex items-end justify-center gap-1 h-8 ${className}`}>
        {[...Array(5)].map((_, i) => (
            <div 
                key={i} 
                className="w-1 bg-[#FFD447] rounded-t-full animate-pulse shadow-[0_0_10px_#FFD447]"
                style={{ 
                    height: `${Math.random() * 60 + 40}%`, 
                    animationDuration: `${0.6 + i * 0.1}s`,
                    animationDelay: `${i * 0.05}s` 
                }} 
            ></div>
        ))}
    </div>
);

const TermsModal: React.FC<{ content: string; onClose: () => void }> = ({ content, onClose }) => (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-[#050505] rounded-[32px] border border-[#FFD447]/30 p-8 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-[0_0_100px_rgba(255,212,71,0.1)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD447] to-transparent"></div>
             
            <h2 className="text-2xl font-black text-[#FFD447] mb-6 font-chakra uppercase tracking-widest text-center text-shadow-glow">Termos e Condições</h2>
            <div className="prose prose-invert prose-sm text-gray-400 overflow-y-auto pr-4 custom-scrollbar leading-relaxed text-justify font-mono">
                <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
            </div>
            <button onClick={onClose} className="mt-8 self-center py-4 px-12 rounded-full bg-[#FFD447] text-black font-black uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,212,71,0.4)]">
                Concordar e Fechar
            </button>
        </div>
    </div>
);

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, icon?: React.ReactNode, leftAddon?: React.ReactNode }> = ({ label, className = "", icon, leftAddon, ...props }) => (
    <div className="group relative w-full">
      <label htmlFor={props.id} className="block text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 ml-1 transition-colors group-focus-within:text-[#FFD447]">{label}</label>
      <div className="relative">
        {leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                {leftAddon}
            </div>
        )}
        <input
            {...props}
            className={`
                w-full bg-[#111] rounded-xl border border-[#FFD447]/20 text-white p-5 text-sm
                placeholder-[#444] transition-all duration-300 font-medium
                focus:border-[#FFD447] focus:ring-0 focus:shadow-[0_0_25px_rgba(255,212,71,0.15)] focus:bg-[#080808] focus:scale-[1.01]
                hover:border-[#FFD447]/40
                ${leftAddon ? 'pl-24' : ''}
                ${className}
            `}
        />
        {/* Input Glow Line at Bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#FFD447] transition-all duration-500 group-focus-within:w-full shadow-[0_0_10px_#FFD447]"></div>
      </div>
    </div>
);

const formatPhoneNumber = (value: string, ddi: string): string => {
  // Removes non-numeric
  const cleaned = ('' + value).replace(/\D/g, '');
  
  // Applies simple mask (11) 91234-5678 ONLY IF Brazil
  if (ddi === '+55') {
      let formatted = cleaned;
      if (cleaned.length > 2) {
        formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
      }
      if (cleaned.length > 7) {
        formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
      }
      return formatted;
  }
  
  return cleaned;
};

// Error Translator Helper
const translateError = (msg: string) => {
    if (!msg) return "Erro desconhecido";
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) return 'Email ou senha incorretos.';
    if (lower.includes('user already registered')) return 'Este email já está cadastrado.';
    if (lower.includes('password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.';
    if (lower.includes('valid email')) return 'Por favor, insira um email válido.';
    return msg; // Fallback
};

const AuthPage: React.FC<AuthPageProps> = ({ termsContent }) => {
  const { dispatch } = useAppContext();
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  
  // States for flow control
  const [registrationSuccess, setRegistrationSuccess] = useState(false); // Legacy auto-login success
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false); // New Supabase flow
  
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [artisticName, setArtisticName] = useState('');
  const [phoneDdi, setPhoneDdi] = useState('+55');
  const [phone, setPhone] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberEmail(true);
    }
  }, []);

  // Trigger shake animation on error
  useEffect(() => {
      if (error) {
          setShake(true);
          const timer = setTimeout(() => setShake(false), 400);
          return () => clearTimeout(timer);
      }
  }, [error]);

  const resetForm = () => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    setEmail(rememberedEmail || '');
    setRememberEmail(!!rememberedEmail);
    setPassword('');
    setConfirmPassword('');
    setName('');
    setArtisticName('');
    setPhone('');
    setPhoneDdi('+55');
    setInstagramUsername('');
    setAgreedToTerms(false);
    setError(null);
    setRegistrationSuccess(false);
    setShowEmailConfirmation(false);
  };
  
  const handleToggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const safeEmail = email.trim();

    try {
      const { user, notifications, isFirstLogin, unseenAdminNotifications } = await login(safeEmail, password);
      
      setTimeout(() => {
          dispatch({ type: 'LOGIN', payload: { user, notifications, unseenAdminNotifications } });
          if (isFirstLogin) {
            dispatch({ type: 'SET_WELCOME_MODAL_VISIBILITY', payload: true });
          }
      }, 800); // Cinematic delay

      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', safeEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(translateError(err.message));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Senha muito curta (mínimo 6 caracteres).");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    if (!agreedToTerms) {
      setError("Você deve concordar com os termos.");
      return;
    }
    setError(null);
    setIsLoading(true);

    // Sanitize Inputs
    const safeName = name.trim();
    const safeArtisticName = artisticName.trim();
    const safeEmail = email.trim();
    // Combine DDI and Phone
    const fullPhone = `${phoneDdi}${phone.replace(/\D/g, '')}`;

    const instagramUrl = instagramUsername ? `https://www.instagram.com/${instagramUsername.replace('@', '').trim()}` : '';

    try {
      const result = await register({ 
          name: safeName, 
          artisticName: safeArtisticName, 
          email: safeEmail, 
          password, 
          phone: fullPhone, 
          instagramUrl
      });
      
      if (result.success) {
          if (result.requireEmailConfirmation) {
              setShowEmailConfirmation(true);
          } else {
              // Legacy/Direct success (Mock mode or auto-confirm off)
              setRegistrationSuccess(true);
              setTimeout(() => {
                setIsLoginView(true);
                resetForm();
              }, 3000);
          }
      }
    } catch (err: any) {
      setError(translateError(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans overflow-y-auto custom-scrollbar relative overflow-hidden">
        
      {/* --- V3 BACKGROUND FX --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
          {/* Gold Radial Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(246,217,107,0.08)_0%,rgba(0,0,0,1)_80%)]"></div>
          {/* Animated Aurora */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,212,71,0.05)_0%,transparent_50%)] animate-aurora"></div>
          {/* Vertical Neon Lines */}
          <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_49px,#FFD447_50px)] bg-[length:100px_100%]"></div>
          {/* Floating Particles */}
          {[...Array(8)].map((_, i) => (
             <div key={i} className="absolute bg-[#FFD447] rounded-full opacity-20 animate-float" style={{
                 width: Math.random() * 4 + 'px', height: Math.random() * 4 + 'px',
                 top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
                 animationDuration: Math.random() * 10 + 10 + 's',
                 animationDelay: Math.random() * 5 + 's'
             }}></div>
          ))}
      </div>

      {/* --- MAIN CARD V3 --- */}
      <div 
        className={`
            relative w-full max-w-[420px] z-10 flex flex-col my-10
            transition-transform duration-200 origin-center
            ${shake ? 'animate-shake' : ''}
            ${isLoading ? 'scale-[0.98] opacity-80 blur-[1px]' : ''}
        `}
      >
        {/* Card Container */}
        <div className={`
            bg-[#050505] p-8 md:p-10 rounded-[26px] 
            border border-[#FFD447]/20 
            shadow-[0_20px_60px_-10px_rgba(0,0,0,1),0_0_30px_rgba(255,212,71,0.05)]
            relative overflow-hidden group
            ${shake ? 'border-red-500/40 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : ''}
        `}>
            
            {/* Inner Border Glow (Double Border Effect) */}
            <div className="absolute inset-[1px] rounded-[25px] border border-[#FFD447]/10 pointer-events-none"></div>
            
            {/* Header */}
            <div className="text-center mb-10 relative">
                <div className="flex justify-center mb-4">
                    <NeonEqualizerIcon />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black font-chakra tracking-tighter text-white relative inline-block">
                    <span className="relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">ARTIST WORLD</span>
                    {/* Scanline Effect on Text */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD447]/30 to-transparent h-[20%] animate-scanline opacity-50 pointer-events-none"></div>
                </h1>
                
                <p className="text-[#F2CB66] text-xs font-bold mt-3 uppercase tracking-[0.25em] opacity-90">
                    {isLoginView ? 'Acesse seu painel de artista' : 'Inicie sua jornada'}
                </p>
            </div>

            {/* CONDITIONAL VIEWS */}
            
            {showEmailConfirmation ? (
                // 1. Email Confirmation Success Screen
                <div className="text-center py-6 animate-fade-in-up">
                    <div className="w-20 h-20 bg-[#FFD447]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FFD447]/30 shadow-[0_0_30px_rgba(255,212,71,0.2)]">
                        <svg className="w-10 h-10 text-[#FFD447]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="font-black text-white text-xl mb-3 font-chakra uppercase">Verifique seu Email</h3>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Enviamos um link de confirmação para <br/><strong className="text-white">{email}</strong>.
                    </p>
                    <p className="text-gray-500 text-xs mb-8">
                        Clique no link enviado para ativar sua conta e liberar o acesso.
                    </p>
                    <button 
                        onClick={() => { setIsLoginView(true); resetForm(); }}
                        className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white border border-[#333] hover:border-[#FFD447] font-bold uppercase tracking-widest text-xs transition-all"
                    >
                        Voltar para Login
                    </button>
                </div>
            ) : registrationSuccess ? (
                // 2. Legacy/Direct Success Screen
                <div className="text-center py-10 animate-fade-in-up">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#27AE60] to-[#2ECC71] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(39,174,96,0.4)]">
                        <CheckIcon className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="font-black text-white text-xl mb-2 font-chakra uppercase">Conta Criada!</h3>
                    <p className="text-[#808080] text-sm">Preparando o palco para você...</p>
                </div>
            ) : (
                // 3. Forms (Login / Register)
                <>
                    <form onSubmit={isLoginView ? handleLogin : handleRegister} className="space-y-6 relative z-20">
                    
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-900/10 border border-red-500/40 text-red-400 text-xs font-bold rounded-xl text-center shadow-inner animate-fade-in-up uppercase tracking-wide flex items-center justify-center gap-2">
                             <ShieldIcon className="w-4 h-4" />
                             {error}
                        </div>
                    )}
                    
                    {!isLoginView && (
                        <div className="space-y-5 animate-fade-in-up">
                            <InputField label="Nome Completo" id="name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome real" />
                            <InputField label="Nome Artístico" id="artisticName" type="text" value={artisticName} onChange={e => setArtisticName(e.target.value)} required placeholder="Nome de palco" />
                            
                            <div className="flex gap-3">
                                <div className="w-24">
                                     <InputField 
                                        label="DDI" 
                                        id="phoneDdi" 
                                        type="text" 
                                        value={phoneDdi} 
                                        onChange={e => setPhoneDdi(e.target.value)} 
                                        placeholder="+55" 
                                        required 
                                    />
                                </div>
                                <div className="flex-1">
                                    <InputField 
                                        label="Celular" 
                                        id="phone" 
                                        type="tel" 
                                        value={phone} 
                                        onChange={e => setPhone(formatPhoneNumber(e.target.value, phoneDdi))} 
                                        placeholder="00000-0000" 
                                        required 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-5">
                        <InputField label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="exemplo@email.com" />
                        <InputField label="Senha" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                    </div>

                    {!isLoginView && (
                        <div className="space-y-5 animate-fade-in-up">
                            <InputField label="Confirmar Senha" id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                            <div className="grid grid-cols-1 gap-4">
                                <InputField label="Instagram" id="instagramUsername" type="text" value={instagramUsername} onChange={e => setInstagramUsername(e.target.value)} placeholder="@user" required />
                            </div>
                        </div>
                    )}
                    
                    {isLoginView && (
                        <div className="flex items-center pt-2">
                            <label className="flex items-center text-xs font-bold text-[#666] cursor-pointer group hover:text-[#B3B3B3] transition-colors select-none uppercase tracking-wide">
                                <div className="relative mr-3">
                                    <input type="checkbox" checked={rememberEmail} onChange={e => setRememberEmail(e.target.checked)} className="sr-only peer" />
                                    <div className="w-5 h-5 border border-[#444] rounded-full bg-[#111] peer-checked:bg-[#FFD447] peer-checked:border-[#FFD447] transition-all shadow-inner"></div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity transform scale-50 peer-checked:scale-100">
                                        <div className="w-2 h-2 bg-black rounded-full"></div>
                                    </div>
                                    {/* Checkbox Glow */}
                                    <div className="absolute inset-0 bg-[#FFD447] rounded-full blur-md opacity-0 peer-checked:opacity-40 transition-opacity duration-500"></div>
                                </div>
                                Lembrar Email
                            </label>
                        </div>
                    )}
                    
                    {!isLoginView && (
                        <div className="space-y-3 pt-2">
                             <label className="flex items-start text-[10px] text-[#666] cursor-pointer group hover:text-[#999] transition-colors uppercase tracking-wide font-bold">
                                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} required className="accent-[#FFD447] mr-3 mt-0.5" />
                                <span>
                                    Concordo com os <button type="button" onClick={(e) => { e.preventDefault(); setIsTermsModalOpen(true); }} className="text-[#FFD447] hover:text-white hover:underline ml-1">Termos e Condições</button>.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* --- FESTIVAL LAUNCH BUTTON --- */}
                    <div className="pt-6 pb-2">
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className={`
                                w-full py-5 rounded-xl
                                bg-gradient-to-r from-[#FFD447] via-[#FFC000] to-[#FFD447] bg-[length:200%_auto] animate-gradient-x
                                text-black font-black uppercase tracking-[0.2em] text-sm
                                border-[2px] border-white/20
                                shadow-[0_0_25px_rgba(255,212,71,0.3)]
                                hover:shadow-[0_0_50px_rgba(255,212,71,0.6)] hover:scale-[1.03] hover:border-white
                                active:scale-[0.98] active:shadow-none
                                transition-all duration-300 relative overflow-hidden group
                                disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                            `}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                                        <span className="opacity-80">Acessando...</span>
                                    </>
                                ) : (
                                    <>
                                        {isLoginView ? 'Entrar' : 'Finalizar Cadastro'}
                                        <span className="group-hover:translate-x-1 transition-transform text-lg">➜</span>
                                    </>
                                )}
                            </span>
                            {/* Button Shine */}
                            <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-500 skew-y-12 pointer-events-none"></div>
                        </button>
                    </div>
                    
                    <div className="text-center border-t border-[#222] pt-6 mt-2">
                         <button 
                            type="button" 
                            onClick={handleToggleView} 
                            className="text-xs text-[#F6D96B] hover:text-white transition-all font-bold uppercase tracking-widest flex items-center justify-center gap-2 mx-auto group/link p-2"
                        >
                            {isLoginView ? 'Criar uma conta' : 'Voltar para Login'}
                            <span className="group-hover/link:translate-x-1 transition-transform text-lg leading-none">→</span>
                        </button>
                    </div>

                    </form>
                </>
            )}
        </div>
      </div>

      {isTermsModalOpen && <TermsModal content={termsContent} onClose={() => setIsTermsModalOpen(false)} />}
    </div>
  );
};

export default AuthPage;