import React from 'react';
import Head from 'next/head';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-[#f5f1eb] text-gray-900 font-sans selection:bg-pink-200 selection:text-pink-900">
            <Head>
                <title>Push Chain x402 Payment Protocol</title>
                <meta name="description" content="A complete implementation of the x402 Payment Protocol for Push Chain" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            {/* Navigation */}
            <nav className="container mx-auto px-4 py-6 max-w-7xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/pushchain.png" alt="Push Chain" className="h-8 w-auto rounded-md" />
                        <span className="font-bold text-xl text-gray-900">Push x402</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm">
                        <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Features</a>
                        <a href="#why-push" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Why Push Chain</a>
                        <a href="#sdk" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">SDK</a>
                        <a href="https://www.npmjs.com/package/push-x402" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Docs</a>
                        <a href="https://github.com/SamsShow/pushindexer" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">GitHub</a>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {children}
            </main>

            <footer className="text-center py-12 text-gray-500 text-sm border-t border-gray-200 mt-20">
                <p className="mb-2">© {new Date().getFullYear()} Push Chain x402 Protocol</p>
                <p className="text-xs">Built with ❤️ by DonaLabs</p>
            </footer>
        </div>
    );
}
