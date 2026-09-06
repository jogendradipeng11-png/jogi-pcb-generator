import React, { useState } from 'react';
import {
  X,
  Github,
  ExternalLink,
  Copy,
  Check,
  Download,
  Terminal,
  Globe,
  Rocket,
  Code2,
  Lock,
  User,
  FolderGit2,
  FileCode,
  ShieldCheck,
  Sparkles,
  Play,
  Youtube,
  Film
} from 'lucide-react';
import { UserProfile } from '../../types';

interface GitHubDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
  appTitle?: string;
}

export const GitHubDeployModal: React.FC<GitHubDeployModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuthModal,
  appTitle = 'CircuitForge - EDA Suite',
}) => {
  const [repoName, setRepoName] = useState('circuitforge-eda-suite');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'deploy' | 'commands' | 'export' | 'video'>('quickstart');

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://circuitforge.io';
  const repoUrl = `https://github.com/${currentUser?.email ? currentUser.email.split('@')[0] : 'your-username'}/${repoName}`;

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const gitBashSnippet = `# 1. Initialize local repository
git init
git add .
git commit -m "feat: complete CircuitForge EDA suite with schematic, simulation, PCB & auth"

# 2. Add your GitHub remote
git branch -M main
git remote add origin ${repoUrl}.git

# 3. Push to GitHub
git push -u origin main`;

  const vercelNetlifySnippet = `# Build and deploy commands for Vercel, Netlify, or Cloud Run:
Build Command:   npm run build
Output Directory: dist
Install Command:  npm install`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shadow-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Deploy &amp; Publish via GitHub</h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80 text-[10px] font-semibold">
                  Production Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deploy this full-stack electronic schematic &amp; PCB designer for all users
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account / Sign-Up Status Banner */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <>
                <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  ✓
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Signed in as </span>
                  <span className="font-semibold text-slate-200">{currentUser.name}</span>
                  <span className="text-slate-500 ml-1.5 font-mono">({currentUser.email})</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400 text-xs font-bold">
                  !
                </div>
                <div className="text-xs text-slate-300">
                  <span>Guest session active. Sign up so users can save circuits and access personal accounts.</span>
                </div>
              </>
            )}
          </div>

          {!currentUser && onOpenAuthModal && (
            <button
              onClick={() => {
                onClose();
                onOpenAuthModal('signup');
              }}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quickstart'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Simple 4-Step Guide
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            GitHub URL &amp; Live Setup
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'commands'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Git Push Commands
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            Export Code / ZIP
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'video'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-rose-500" />
            <span>YouTube Video Tutorials</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 text-[9px] font-bold border border-rose-800">
              NEW
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-950/40 border border-sky-800/60 rounded-xl">
                <h3 className="text-sm font-bold text-sky-200 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-sky-400" />
                  Simple 4-Step GitHub Deployment Guide
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Follow these 4 simple steps to put your complete CircuitForge web application on GitHub and make it live for users.
                </p>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-bold flex items-center justify-center">
                        1
                      </span>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Create a Repository on GitHub
                      </h4>
                    </div>
                    <a
                      href="https://github.com/new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      Open github.com/new <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-300">
                    Sign in to your GitHub account and create a new public or private repository named <code className="text-sky-300 font-mono font-bold">{repoName}</code>. Do not check "Add README".
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center justify-center">
                        2
                      </span>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Export Project Files
                      </h4>
                    </div>
                    <button
                      onClick={() => setActiveTab('export')}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Export Tab <FolderGit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300">
                    Download the project files from AI Studio Settings → <strong className="text-slate-100">Export to GitHub / ZIP</strong>, or clone your workspace.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 text-xs font-bold flex items-center justify-center">
                        3
                      </span>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Push Code to GitHub (3 Commands)
                      </h4>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`git remote add origin ${repoUrl}.git\ngit branch -M main\ngit push -u origin main`, 'push3')}
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'push3' ? 'Copied Commands' : 'Copy Commands'} <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-200">
                    <div>git remote add origin <span className="text-sky-300">{repoUrl}.git</span></div>
                    <div>git branch -M main</div>
                    <div>git push -u origin main</div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center justify-center">
                        4
                      </span>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Deploy Online &amp; Invite Users
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                      Auto-Deploys on push
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Connect your GitHub repo to <strong>Vercel</strong>, <strong>Netlify</strong>, or <strong>Cloud Run</strong> with one click. Build command: <code className="text-sky-300 font-mono">npm run build</code>, output directory: <code className="text-sky-300 font-mono">dist</code>. Users open your URL, sign up, and create circuits immediately!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-4">
              {/* Target Repository Input */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Target GitHub Repository Name
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">github.com/.../</span>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 focus:outline-hidden"
                    placeholder="circuitforge-eda-suite"
                  />
                </div>

                {/* Generated Target GitHub URL */}
                <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Target GitHub Repository URL:</span>
                    <div className="font-mono text-sky-400 text-[11px] mt-0.5 select-all">
                      {repoUrl}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(repoUrl, 'repourl')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'repourl' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* How Users Access & Sign Up */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  User Sign-Up &amp; Access Flow
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                    <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-sky-900 text-sky-300 flex items-center justify-center text-[10px]">1</span>
                      Deploy App
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Deploy the repository to Cloud Run, Vercel, Netlify, or GitHub Pages. The static build outputs cleanly to <code className="text-sky-300 font-mono">dist/</code>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                    <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center text-[10px]">2</span>
                      User Sign-Up
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Users can create accounts with Email/Password or 1-Click WhatsApp OTP verification from the top bar.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                    <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-purple-900 text-purple-300 flex items-center justify-center text-[10px]">3</span>
                      Save &amp; Simulate
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Users design circuits, run real-time transient simulation, probe voltages, and export Gerber/BOM files under their profile.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Live URL */}
              <div className="p-3.5 bg-sky-950/40 border border-sky-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-sky-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Instant Live Web App URL (Active Preview)
                  </div>
                  <div className="text-[11px] font-mono text-sky-400 mt-0.5 select-all">
                    {currentHost}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(currentHost, 'liveurl')}
                  className="px-2.5 py-1 bg-sky-900/80 hover:bg-sky-800 text-sky-200 rounded text-xs font-medium border border-sky-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'liveurl' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-sky-400" />
                    <span>Push to GitHub via Terminal</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(gitBashSnippet, 'gitsnippet')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[11px] font-medium border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'gitsnippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'gitsnippet' ? 'Copied' : 'Copy Commands'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed border border-slate-800/80">
                  {gitBashSnippet}
                </pre>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-purple-400" />
                    <span>Hosting Platform Configuration</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(vercelNetlifySnippet, 'hostingsnippet')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[11px] font-medium border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'hostingsnippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'hostingsnippet' ? 'Copied' : 'Copy Config'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800/80">
                  {vercelNetlifySnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-slate-900 border border-slate-750 rounded-xl text-sky-400">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Direct GitHub Export via AI Studio
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You can directly push this app to your connected GitHub account without using the terminal:
                    </p>
                    <ol className="mt-2 space-y-1.5 text-xs text-slate-300 list-decimal list-inside font-medium">
                      <li>Click the top-right <strong className="text-white">Settings / Menu</strong> icon in Google AI Studio.</li>
                      <li>Select <strong className="text-sky-400">"Export to GitHub"</strong> or <strong className="text-sky-400">"Download ZIP"</strong>.</li>
                      <li>Choose your GitHub organization or personal profile to create the repository automatically.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Full User Authentication Included</div>
                    <div className="text-[11px] text-slate-400">
                      Email/Password login + WhatsApp OTP verification is pre-wired and runs automatically for all deployed users.
                    </div>
                  </div>
                </div>
                {!currentUser && onOpenAuthModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuthModal('signup');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    Test Sign Up
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-rose-400" />
                    YouTube Video Tutorials: Deploy React + Vite App to GitHub
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Step-by-step video guides showing how to push your code to GitHub and host it live on GitHub Pages or Vercel.
                  </p>
                </div>
                <a
                  href="https://www.youtube.com/results?search_query=how+to+deploy+vite+react+app+to+github+pages"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Video Tutorial Card 1: GitHub Pages with gh-pages */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                      <Play className="w-5 h-5 fill-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 text-[10px] font-bold border border-rose-700/50">
                          Recommended Video
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">Duration: ~5-7 mins</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        How to Deploy a Vite React App to GitHub Pages (Complete Guide)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Follow along step-by-step to push your code, install gh-pages, set up vite.config.ts, and deploy.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://www.youtube.com/results?search_query=how+to+deploy+vite+react+app+to+github+pages+step+by+step"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <span>Watch Tutorial</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Video Key Timestamps Checklist */}
                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-rose-400" />
                    Video Chapter Breakdown &amp; Steps Covered:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-start gap-2 p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                      <span className="font-mono text-rose-400 font-bold">0:00</span>
                      <span className="text-slate-300">Create new repository on GitHub (public, no README)</span>
                    </div>
                    <div className="flex items-start gap-2 p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                      <span className="font-mono text-rose-400 font-bold">1:15</span>
                      <span className="text-slate-300">Git commands: git init, git add ., git commit, git push</span>
                    </div>
                    <div className="flex items-start gap-2 p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                      <span className="font-mono text-rose-400 font-bold">2:30</span>
                      <span className="text-slate-300">Install gh-pages: <code className="text-sky-300 font-mono">npm i -D gh-pages</code></span>
                    </div>
                    <div className="flex items-start gap-2 p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                      <span className="font-mono text-rose-400 font-bold">3:45</span>
                      <span className="text-slate-300">Configure <code className="text-sky-300 font-mono">base: '/repo-name/'</code> in vite.config.ts</span>
                    </div>
                    <div className="flex items-start gap-2 p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                      <span className="font-mono text-rose-400 font-bold">4:50</span>
                      <span className="text-slate-300">Add predeploy &amp; deploy scripts to package.json</span>
                    </div>
                    <div className="flex items-start gap-2 p-1.5 bg-slate-950/50 rounded border border-slate-800/80">
                      <span className="font-mono text-rose-400 font-bold">5:45</span>
                      <span className="text-slate-300">Run <code className="text-emerald-300 font-mono">npm run deploy</code> &amp; test live URL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Tutorial Card 2: 1-Click Vercel / Netlify deployment */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
                      <Rocket className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-300 text-[10px] font-bold border border-sky-700/50">
                          Easiest Alternative
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">Duration: ~2-3 mins</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        How to Deploy a GitHub React App to Vercel in 2 Minutes (Free &amp; Automatic)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        If you don't want to install extra packages, Vercel connects directly to your GitHub repository and automatically deploys with zero configuration and free custom domains.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://www.youtube.com/results?search_query=how+to+deploy+react+vite+app+to+vercel+from+github"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <span>Watch on YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
                  <div className="text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span><strong>Why developers love Vercel:</strong> Push code to GitHub &rarr; Vercel automatically rebuilds and publishes the changes instantly!</span>
                  </div>
                </div>
              </div>

              {/* Crucial Tip: Preventing the Blank Screen */}
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  ⚠️ Top Tip Mentioned in Every YouTube Tutorial (Avoid Blank Screen):
                </div>
                <p className="text-slate-300 leading-relaxed">
                  When deploying to GitHub Pages, the site URL is usually <code className="text-amber-200 font-mono">username.github.io/repo-name/</code>.
                  In <code className="text-amber-200 font-mono">vite.config.ts</code>, you must set:
                </p>
                <pre className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-sky-300 overflow-x-auto">
{`export default defineConfig({
  base: '/${repoName}/', // Replace with your exact repository name!
  plugins: [react()],
});`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ready for public users &amp; multi-user circuit creation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
