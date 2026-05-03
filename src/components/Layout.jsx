import { Outlet, NavLink } from 'react-router-dom';
import { Home, BookA, GraduationCap, Settings, StickyNote, BookOpenCheck, Bot, BrainCircuit, Volume2 } from 'lucide-react';

const navItems = [
  { to: '/', icon: <Home size={22} />, label: 'Home' },
  { to: '/words', icon: <BookA size={22} />, label: 'Dizionario' },
  { to: '/review', icon: <GraduationCap size={22} />, label: 'Ripasso' },
  { to: '/verbs', icon: <BookOpenCheck size={22} />, label: 'Verbi' },
  { to: '/verbo-quiz', icon: <BrainCircuit size={22} />, label: 'Verbo Quiz' },
  { to: '/pronuncia', icon: <Volume2 size={22} />, label: 'Pronuncia' },
  { to: '/notes', icon: <StickyNote size={22} />, label: 'Note' },
  { to: '/ai', icon: <Bot size={22} />, label: 'Studio AI' },
  { to: '/settings', icon: <Settings size={22} />, label: 'Impostazioni' },
];

const LogoMark = () => (
  <div className="h-11 w-11 rounded-xl bg-primary-900/40 border border-primary-700/50 flex items-center justify-center shadow-[0_0_26px_rgba(79,211,173,0.12)]">
    <span className="text-primary-300 font-black text-sm">IT</span>
  </div>
);

const desktopNavClass = ({ isActive }) =>
  `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold ${
    isActive
      ? 'bg-primary-900/35 text-primary-300 border border-primary-800/60 shadow-[0_8px_24px_rgba(42,184,145,0.08)]'
      : 'text-gray-400 border border-transparent hover:bg-white/[0.04] hover:text-gray-200'
  }`;

const mobileNavClass = ({ isActive }) =>
  `flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors duration-200 ${
    isActive ? 'text-primary-300 bg-primary-900/25' : 'text-gray-500 hover:text-gray-300'
  }`;

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#11171b]/95 backdrop-blur border-t border-white/10 z-50 px-3 py-3 flex items-center gap-3 overflow-x-auto shadow-[0_-12px_30px_rgba(0,0,0,0.28)]">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={mobileNavClass}>
            {item.icon}
            <span className="text-[10px] font-semibold">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <nav className="hidden md:flex flex-col w-72 bg-[#11171b]/92 backdrop-blur border-r border-white/10 fixed h-full z-50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <h1 className="text-xl font-extrabold text-gray-100 leading-tight">Il Mio</h1>
              <p className="text-primary-300 font-bold leading-tight">Vocabolario Italiano</p>
            </div>
          </div>
        </div>

        <div className="flex-1 py-6 flex flex-col gap-2 px-4">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={desktopNavClass}>
              <span className="text-current/90">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="px-5 pb-6">
          <div className="rounded-xl border border-primary-900/50 bg-primary-950/20 p-4">
            <p className="text-sm font-bold text-primary-300">Studio quotidiano</p>
            <p className="text-xs text-gray-500 mt-1">Parole, verbi, note e ripasso in un unico spazio.</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 md:ml-72 pb-24 md:pb-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
