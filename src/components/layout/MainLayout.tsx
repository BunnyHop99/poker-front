import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  DollarSign,
  Receipt,
  PiggyBank,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Coins,
  UserCog,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/dashboard',
  },
  {
    label: 'Turno',
    icon: <Clock className="w-5 h-5" />,
    path: '/turno',
    roles: ['GERENTE', 'CAJERO'],
  },
  {
    label: 'Mesas',
    icon: <Layers className="w-5 h-5" />,
    path: '/mesas',
  },
  {
    label: 'Jugadores',
    icon: <Users className="w-5 h-5" />,
    path: '/jugadores',
  },
  {
    label: 'Fichas',
    icon: <Coins className="w-5 h-5" />,
    path: '/fichas',
    roles: ['GERENTE', 'CAJERO'],
  },
  {
    label: 'Caja',
    icon: <DollarSign className="w-5 h-5" />,
    path: '/caja',
    roles: ['GERENTE', 'CAJERO'],
    children: [
      { label: 'Ventas', icon: <CreditCard className="w-4 h-4" />, path: '/caja/ventas' },
      { label: 'Cobros', icon: <Receipt className="w-4 h-4" />, path: '/caja/cobros' },
      { label: 'Gastos', icon: <PiggyBank className="w-4 h-4" />, path: '/caja/gastos' },
    ],
  },
  {
    label: 'Rake',
    icon: <DollarSign className="w-5 h-5" />,
    path: '/rake',
    roles: ['GERENTE', 'DEALER'],
  },
  {
    label: 'Propinas',
    icon: <PiggyBank className="w-5 h-5" />,
    path: '/propinas',
    roles: ['GERENTE', 'CAJERO'],
  },
  {
    label: 'Cierre',
    icon: <FileText className="w-5 h-5" />,
    path: '/cierre',
    roles: ['GERENTE'],
  },
  {
    label: 'Personal',
    icon: <UserCog className="w-5 h-5" />,
    path: '/personal',
    roles: ['GERENTE'],
  },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const canAccess = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return user?.tipo && roles.includes(user.tipo);
  };

  const filteredMenuItems = menuItems.filter((item) => canAccess(item.roles));

  const NavItem = ({ item, mobile = false }: { item: MenuItem; mobile?: boolean }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.label)}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg
              transition-all duration-200
              ${isActive ? 'bg-gold/10 text-gold' : 'text-silver hover:bg-white/5 hover:text-pearl'}
            `}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {(sidebarOpen || mobile) && <span className="font-medium">{item.label}</span>}
            </div>
            {(sidebarOpen || mobile) && (
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </button>
          {isExpanded && (sidebarOpen || mobile) && (
            <div className="ml-4 mt-1 space-y-1 border-l border-graphite pl-3">
              {item.children!.map((child) => (
                <Link
                  key={child.path}
                  to={child.path}
                  onClick={() => mobile && setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                    transition-all duration-200
                    ${location.pathname === child.path
                      ? 'bg-gold/10 text-gold'
                      : 'text-silver hover:bg-white/5 hover:text-pearl'}
                  `}
                >
                  {child.icon}
                  <span>{child.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.path}
        onClick={() => mobile && setMobileMenuOpen(false)}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg
          transition-all duration-200
          ${isActive ? 'bg-gold/10 text-gold' : 'text-silver hover:bg-white/5 hover:text-pearl'}
        `}
      >
        {item.icon}
        {(sidebarOpen || mobile) && <span className="font-medium">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-midnight flex">
      {/* Sidebar Desktop */}
      <aside
        className={`
          hidden lg:flex flex-col
          ${sidebarOpen ? 'w-64' : 'w-20'}
          bg-charcoal border-r border-graphite
          transition-all duration-300
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-graphite">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                <span className="text-midnight font-bold text-lg">P</span>
              </div>
              <div>
                <h1 className="font-bold text-pearl">Poker Sala</h1>
                <p className="text-xs text-silver">Control</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-midnight font-bold text-lg">P</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-silver"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-graphite">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate flex items-center justify-center">
                <span className="text-gold font-semibold">
                  {user?.nombre_completo?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-pearl truncate">
                  {user?.apodo || user?.nombre_completo}
                </p>
                <p className="text-xs text-gold">{user?.tipo}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/5 text-silver hover:text-ruby"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 rounded-lg hover:bg-white/5 text-silver hover:text-ruby flex justify-center"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <div className="h-16 bg-charcoal border-b border-graphite flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-midnight font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-pearl">Poker Sala</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-silver"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 bg-charcoal/95 backdrop-blur-sm">
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {filteredMenuItems.map((item) => (
                <NavItem key={item.path} item={item} mobile />
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-graphite bg-charcoal">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate flex items-center justify-center">
                    <span className="text-gold font-semibold">
                      {user?.nombre_completo?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-pearl">{user?.apodo || user?.nombre_completo}</p>
                    <p className="text-xs text-gold">{user?.tipo}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-white/5 text-silver hover:text-ruby"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:overflow-y-auto">
        <div className="lg:hidden h-16" />
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
