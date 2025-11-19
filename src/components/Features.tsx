import React from 'react';

const apis = [
    {
        name: 'Facilitator API',
        endpoint: '/api/facilitator/info',
        description: 'Get information about the facilitator service.',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
        )
    },
    {
        name: 'Indexer API',
        endpoint: '/api/indexer/tx?hash=0x...',
        description: 'Query transaction details by hash.',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        )
    },
    {
        name: 'Payment API',
        endpoint: '/api/payment/process',
        description: 'Process payments securely.',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
        )
    },
    {
        name: 'Protected Resource',
        endpoint: '/api/protected/weather',
        description: 'Access protected resources (returns 402 if unpaid).',
        isProtected: true,
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
        )
    }
];

export default function Features() {
    return (
        <section id="features" className="py-20 scroll-mt-20">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                    Powerful APIs for Every Need
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Comprehensive suite of APIs to build, query, and manage blockchain transactions
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {apis.map((api, index) => (
                    <div
                        key={index}
                        className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 hover:border-pink-300 hover:-translate-y-1 group cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-pink-50 rounded-2xl text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                                {api.icon}
                            </div>
                            {api.isProtected && (
                                <span className="px-3 py-1 text-xs font-semibold text-pink-700 bg-pink-100 rounded-full border border-pink-200">
                                    402
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-pink-600 transition-colors">
                            {api.name}
                        </h3>
                        <code className="block bg-gray-50 text-pink-600 px-4 py-3 rounded-xl text-xs md:text-sm font-mono mb-4 break-all border border-gray-200 group-hover:border-pink-200 transition-colors">
                            {api.endpoint}
                        </code>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {api.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* Stats Section */}
            <div className="mt-20 max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-200 rounded-3xl p-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-pink-500 mb-2">99.9%</div>
                            <div className="text-gray-600 font-medium">Uptime</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-pink-500 mb-2">~3-5s</div>
                            <div className="text-gray-600 font-medium">Settlement Time</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-pink-500 mb-2">1K+</div>
                            <div className="text-gray-600 font-medium">Weekly Downloads</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
