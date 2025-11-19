import React, { useState } from 'react';

export default function SdkInstall() {
    const [copied, setCopied] = useState(false);
    const command = 'npm install push-x402 axios';

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section id="sdk" className="py-20 max-w-4xl mx-auto scroll-mt-20">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                    Get Started in Seconds
                </h2>
                <p className="text-lg text-gray-600">
                    Install the SDK and start building with Push Chain x402
                </p>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 md:p-10 shadow-2xl overflow-hidden relative border border-gray-800">
                {/* Terminal Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-gray-400 text-sm font-medium ml-2">terminal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Command Line */}
                <div className="relative group">
                    <pre className="font-mono text-gray-300 text-base md:text-lg overflow-x-auto p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
                        <span className="text-green-400">$</span> <span className="text-pink-400">{command}</span>
                    </pre>
                    <button
                        onClick={handleCopy}
                        className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all font-medium text-sm flex items-center gap-2"
                        title="Copy to clipboard"
                    >
                        {copied ? (
                            <>
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span className="text-green-400">Copied!</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Links and Info */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-800">
                    <p className="text-gray-400 text-sm">
                        Check out the <a href="https://www.npmjs.com/package/push-x402?activeTab=readme" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline decoration-pink-400/30 underline-offset-2 transition-all font-medium">full documentation</a>
                    </p>
                    <a 
                        href="https://github.com/SamsShow/pushindexer" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                        </svg>
                        View on GitHub
                    </a>
                </div>
            </div>

            {/* Quick Start Steps */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6">
                    <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                        1
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Install SDK</h3>
                    <p className="text-sm text-gray-600">Add the package to your project</p>
                </div>
                <div className="text-center p-6">
                    <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                        2
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Configure</h3>
                    <p className="text-sm text-gray-600">Set up your API credentials</p>
                </div>
                <div className="text-center p-6">
                    <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                        3
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Start Building</h3>
                    <p className="text-sm text-gray-600">Create your first transaction</p>
                </div>
            </div>
        </section>
    );
}
