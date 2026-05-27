import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Navigation */}
      <nav className={`w-full bg-white sticky top-0 z-50 transition-all ${isScrolled ? 'border-b border-[#E5E7EB] shadow-[0_1px_0_rgba(0,0,0,0.03)]' : 'border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#115e59] tracking-tight">Veridian</span>
            <span className="text-[10px] text-gray-400 font-bold px-1.5 py-0.5 bg-gray-100 rounded tracking-wider uppercase">Breathe ESG</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Product</a>
            <a href="#precision" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Solutions</a>
            <a href="#resources" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Resources</a>
            <a href="#enterprise" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Enterprise</a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-white bg-[#115e59] hover:bg-[#0f766e] transition-all px-4 py-2 rounded-lg shadow-sm"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-white pt-12 pb-24 overflow-hidden border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Content */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-teal-800 bg-teal-50 tracking-wide uppercase mb-6 border border-teal-200">
              ⚡ Enterprise Grade Sustainability
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
              Automate Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#115e59] to-[#0f766e]">
                Carbon Intelligence
              </span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
              Centralize multi-source environmental data from SAP, utility providers, and travel partners. Veridian transforms fragmented datasets into audit-ready carbon insights for global analysts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3.5 text-base font-bold text-white bg-[#115e59] hover:bg-[#0f766e] transition-all rounded-xl shadow-lg shadow-teal-900/10"
              >
                Request Demo
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3.5 text-base font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all rounded-xl"
              >
                View Platform
              </Link>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-lg bg-gradient-to-tr from-teal-50 to-slate-100 rounded-3xl p-6 shadow-2xl border border-gray-100 animate-pulse-slow transition-transform duration-300 hover:-translate-y-1">
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                {/* Header bar */}
                <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                  <div className="ml-4 bg-white border border-slate-200 px-3 py-0.5 rounded text-[10px] text-gray-400 font-mono">
                    app.veridian.io/dashboard
                  </div>
                </div>
                {/* Simulated Content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Total Footprint</div>
                      <div className="text-2xl font-bold text-[#115e59]">12,482.50 tCO₂e</div>
                    </div>
                    <div className="bg-teal-50 p-2 rounded-lg text-[#115e59]">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  {/* Simplified mini-bar chart */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Scope 1 (Direct)</span>
                      <span>3,412 tCO₂e</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full" style={{ width: '40%' }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Scope 2 (Indirect)</span>
                      <span>6,180 tCO₂e</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Scope 3 (Value Chain)</span>
                      <span>2,890.5 tCO₂e</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: '30%' }}></div>
                    </div>
                    <div className="pt-2 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                      YoY Change <span className="text-emerald-500">▼ 8.3%</span> <span className="text-gray-400">vs 2022</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trusted By Logos */}
      <section className="bg-slate-50 border-b border-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-6">
            Trusted by Industry Leaders
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-60">
            <span className="text-gray-500 font-bold tracking-widest text-lg">ECOCORP</span>
            <span className="text-gray-500 font-bold tracking-widest text-lg">SKYSTREAM</span>
            <span className="text-gray-500 font-bold tracking-widest text-lg">VERDANT</span>
            <span className="text-gray-500 font-bold tracking-widest text-lg">GLOBALLOGIC</span>
            <span className="text-gray-500 font-bold tracking-widest text-lg">APEX</span>
          </div>
        </div>
      </section>

      {/* Engineered for Precision */}
      <section id="features" className="bg-white py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Engineered for Technical Precision
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed mb-16">
            Veridian bridges the gap between raw activity data and boardroom-ready disclosures through automated ETL and scientific calculation frameworks.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-slate-50 rounded-2xl border border-gray-200 text-left hover:shadow-md transition-all group hover:border-t-2 hover:border-t-teal-500">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Seamless Ingestion</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Direct connectors for SAP, Oracle, and global utility portals. Eliminate manual CSV imports with robust API-first data pipelines.
              </p>
              <Link to="/login" className="text-xs font-bold text-[#115e59] hover:underline flex items-center gap-1">
                50+ Connectors <span>→</span>
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-slate-50 rounded-2xl border border-gray-200 text-left hover:shadow-md transition-all group hover:border-t-2 hover:border-t-amber-500">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Intelligent Normalization</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Automatically map activity units to kgCO₂e using latest IPCC and DEFRA emission factors. Real-time unit conversion and outlier detection.
              </p>
              <Link to="/login" className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1">
                AI Mapping Engine <span>→</span>
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-slate-50 rounded-2xl border border-gray-200 text-left hover:shadow-md transition-all group hover:border-t-2 hover:border-t-blue-500">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Audit-Ready Reporting</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Complete lineage for every data point. Flagged records and automated review queues ensure your disclosures withstand scrutiny.
              </p>
              <Link to="/login" className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1">
                ISAE 3000 Ready <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Review Queue Mockup Section */}
      <section id="precision" className="bg-slate-50 py-24 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Review Queue Text */}
          <div className="lg:col-span-5 text-left">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">
              The Review Queue
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              Manage exceptions and validate high-impact records before they hit your final reporting. A purpose-built workspace for sustainability analysts.
            </p>
            <ul className="space-y-4">
              {[
                'Automate 90% of data verification',
                'Flag anomalies in historical utility spend',
                'Collaborative analyst approval workflows',
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Review Queue Table Mockup */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {/* Header bar */}
            <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <span className="ml-4 text-xs font-semibold text-gray-500">Review Queue — Q3 Global Operations</span>
              </div>
            </div>
            
            {/* Table content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Entity</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Activity Type</th>
                    <th className="px-6 py-3 text-right">tCO₂e</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr>
                    <td className="px-6 py-4 font-semibold">EMEA Logistics Hub</td>
                    <td className="px-6 py-4 text-slate-500">SAP ERP</td>
                    <td className="px-6 py-4">Diesel Fleet</td>
                    <td className="px-6 py-4 text-right">462.18</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 font-semibold text-[10px]">Approved</span>
                    </td>
                  </tr>
                  <tr className="bg-amber-50/20 border-l-2 border-amber-400 animate-pulse-border">
                    <td className="px-6 py-4 font-semibold">APAC Data Center</td>
                    <td className="px-6 py-4 text-slate-500">Utility Bill</td>
                    <td className="px-6 py-4">Purchased Elec.</td>
                    <td className="px-6 py-4 text-right text-red-600 font-bold">1,208.40</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-100 font-semibold text-[10px]">Flagged</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold">US West Offices</td>
                    <td className="px-6 py-4 text-slate-500">Egencia</td>
                    <td className="px-6 py-4">Business Travel</td>
                    <td className="px-6 py-4 text-right">84.55</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 font-semibold text-[10px]">Pending</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold">Brazil Factory</td>
                    <td className="px-6 py-4 text-slate-500">Manual Upload</td>
                    <td className="px-6 py-4">Natural Gas</td>
                    <td className="px-6 py-4 text-right">512.90</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 font-semibold text-[10px]">Approved</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto bg-[#0D6E6E] rounded-3xl p-12 text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              Ready to simplify your sustainability reporting?
            </h2>
            <p className="text-teal-100 mb-8 leading-relaxed text-sm">
              Join hundreds of enterprises that rely on Veridian for accurate, automated, and audit-ready environmental data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="px-6 py-3.5 bg-white text-[#115e59] font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-all text-sm"
              >
                Request Private Demo
              </Link>
              <Link
                to="/login"
                className="px-6 py-3.5 bg-transparent border border-white text-white font-bold rounded-xl hover:bg-white/10 transition-all text-sm"
              >
                Contact Sales
              </Link>
            </div>
          </div>
          {/* Subtle background SVG graphics for visual excellence */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-12 translate-x-12">
            <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 200 200">
              <path d="M43.3,-62.4C55.4,-52.1,64,-38.3,71.2,-23.1C78.4,-7.8,84.2,8.8,79.5,23.3C74.8,37.8,59.6,50.1,44.7,59.2C29.8,68.2,14.9,74,-0.6,74.8C-16.1,75.6,-32.1,71.4,-44.9,62C-57.7,52.6,-67.2,38,-72,22C-76.8,6,-76.8,-11.3,-71.4,-26C-66,-40.7,-55.1,-52.8,-42,-62.7C-28.9,-72.6,-14.5,-80.3,1,-81.7C16.5,-83.1,31.1,-72.7,43.3,-62.4Z" />
            </svg>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 border-t border-[#1D3A3A]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="flex flex-col gap-4 text-left">
            <span className="text-2xl font-bold text-white tracking-tight">Veridian</span>
            <p className="text-xs leading-relaxed max-w-xs text-slate-500">
              The definitive platform for enterprise carbon intelligence and disclosure.
            </p>
          </div>

          <div className="text-left">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">Platform Overview</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Data Ingestion</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Calculation Engine</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Audit Readiness</a></li>
            </ul>
          </div>

          <div className="text-left">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Compliance</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>

          <div className="text-left">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">API Status</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
          <p className="text-slate-600">&copy; 2026 Veridian Analytics Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#features" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#features" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default Landing
