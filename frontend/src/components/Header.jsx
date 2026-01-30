import Link from 'next/link';

const Header = () => {
  return (
    <header className="w-full bg-black/95 border-b border-gray-800 text-white backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO ALANI */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex flex-col">
              <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                mıron ai
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest -mt-1">
                by Miron Intelligence
              </span>
            </Link>
          </div>

          {/* MENÜ ALANI */}
          <nav className="hidden md:flex space-x-8 items-center">
            <Link href="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Ana Menü
            </Link>
          </nav>

          {/* GİRİŞ / KAYIT ALANI */}
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Giriş Yap
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 text-sm font-semibold text-black bg-white rounded-lg hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              Kaydol
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;