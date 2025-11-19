import React from 'react';

export default function Hero() {
    return (
        <section className="text-center py-16 md:py-24 relative">
            {/* Announcement Banner */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-white/60 backdrop-blur-sm border border-pink-200/50 rounded-full shadow-sm hover:shadow-md transition-shadow">
                <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">x402 Protocol Now Live on Push Chain Testnet</span>
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></div>
            </div>

            {/* Decorative Element - Top Left */}
            <div className="absolute left-8 top-24 hidden lg:block">
                <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="text-pink-200 opacity-40">
                    <path d="M10 40 Q 40 10, 70 30 T 110 40" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
            </div>

            {/* Decorative Element - Top Right */}
            <div className="absolute right-12 top-20 hidden lg:block">
                <svg width="100" height="60" viewBox="0 0 100 60" fill="none" className="text-pink-200 opacity-40">
                    <ellipse cx="50" cy="30" rx="40" ry="25" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="30" cy="20" r="4" fill="currentColor" opacity="0.5"/>
                    <circle cx="70" cy="25" r="3" fill="currentColor" opacity="0.5"/>
                </svg>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight px-4">
                <span className="text-gray-900">Pay Per API Call.</span>
                <br />
                <span className="relative inline-block">
                    <span className="text-gray-900">Built for Agents</span>
                    <span className="text-pink-500">.</span>
                    <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                        <path d="M0 8 Q 50 2, 100 8 T 200 8" stroke="#ec4899" strokeWidth="3" fill="none" strokeLinecap="round"/>
                    </svg>
                </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed px-4">
                Enable micropayments with HTTP 402 Payment Required protocol.<br className="hidden sm:block" />
                Perfect for agentic infrastructure and API monetization.*
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
                <a
                    href="https://pushtest-alpha.vercel.app/demo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center justify-center px-8 py-4 font-semibold text-white transition-all duration-200 bg-pink-500 rounded-full hover:bg-pink-600 hover:scale-105 hover:shadow-xl hover:shadow-pink-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 min-w-[180px]"
                >
                    <span>Test Demo Flow</span>
                </a>
            </div>

            {/* Decorative Element - Bottom Left */}
            <div className="absolute left-16 bottom-8 hidden lg:block">
                <svg width="80" height="100" viewBox="0 0 80 100" fill="none" className="text-pink-200 opacity-40">
                    <path d="M10 20 Q 30 40, 20 70" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <circle cx="25" cy="50" r="3" fill="currentColor" opacity="0.5"/>
                </svg>
            </div>

            {/* Decorative Element - Bottom Right */}
            <div className="absolute right-8 bottom-12 hidden lg:block">
                <svg width="100" height="90" viewBox="0 0 100 90" fill="none" className="text-pink-200 opacity-40">
                    <path d="M20 10 Q 50 30, 80 20 Q 60 50, 70 80" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <circle cx="45" cy="25" r="4" fill="currentColor" opacity="0.5"/>
                </svg>
            </div>
        </section>
    );
}
