import React, { useEffect, useState } from 'react';
import { Send, Clock, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';

export default function Outbox() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'QUEUED' | 'SENT' | 'FAILED'>('ALL');

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const data = await (window as any).electronAPI.invoke('get-sms-outbox');
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch SMS outbox', err);
    }
  };

  const handleRetry = async (id: number) => {
    try {
      setLoading(true);
      await (window as any).electronAPI.invoke('retry-sms', id);
      await fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = messages.filter(m => filter === 'ALL' || m.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h1 className="text-xl font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center space-x-2">
          <Smartphone size={22} />
          <span>SMS Outbox</span>
        </h1>
        <div className="flex space-x-2">
          {(['ALL', 'QUEUED', 'SENT', 'FAILED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${filter === f ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/10 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-xs font-mono text-zinc-500 uppercase">
              <th className="p-3">ID</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Message Body</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created At</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-mono text-zinc-300">
            {filtered.map(msg => (
              <tr key={msg.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                <td className="p-3 text-zinc-500">#{msg.id}</td>
                <td className="p-3">{msg.phone}</td>
                <td className="p-3 text-xs max-w-md truncate">{msg.body}</td>
                <td className="p-3">
                  {msg.status === 'QUEUED' && <span className="flex items-center text-amber-400 text-xs"><Clock size={14} className="mr-1"/> QUEUED</span>}
                  {msg.status === 'SENT' && <span className="flex items-center text-emerald-400 text-xs"><Send size={14} className="mr-1"/> SENT</span>}
                  {msg.status === 'FAILED' && <span className="flex items-center text-red-400 text-xs"><AlertTriangle size={14} className="mr-1"/> FAILED (Retries: {msg.retry_count})</span>}
                </td>
                <td className="p-3 text-xs text-zinc-500">{new Date(msg.created_at).toLocaleString()}</td>
                <td className="p-3 text-right">
                  {msg.status === 'FAILED' && (
                    <button
                      onClick={() => handleRetry(msg.id)}
                      disabled={loading}
                      className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 px-2 py-1 rounded text-xs flex items-center justify-end ml-auto"
                    >
                      <RefreshCw size={12} className="mr-1" />
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-zinc-500 italic">No messages found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
