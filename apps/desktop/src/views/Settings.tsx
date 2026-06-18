import React, { useEffect, useState } from 'react';
import { Save, HardDrive, ShieldAlert, FolderOpen, Database } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    shop_name: '',
    address: '',
    gstin: '',
    state_code: '',
    invoice_prefix: '',
    next_invoice_no: '',
    job_prefix: '',
    next_job_no: '',
    default_gst_rate: '18',
    printer_type: 'A4',
    paper_width: '80mm',
    default_copies: '1',
    sms_enabled: 'false',
    sms_tpl_repair_update: '',
    sms_tpl_payment: '',
    sms_tpl_reminder: '',
    // X1: UPI QR
    upi_vpa: '',
    // X1: SMS Gateway
    sms_gateway: 'MOCK',
    sms_gateway_key: '',
    sms_sender_id: '',
    // X1: WhatsApp Business API
    whatsapp_api_enabled: 'false',
    whatsapp_api_key: '',
    // Phase 4: Role Permissions
    perm_CASHIER_EDIT_PRICE: 'false',
    perm_CASHIER_OVERRIDE_CREDIT: 'false',
    perm_CASHIER_ISSUE_CN: 'false',
    perm_CASHIER_VOID_SALE: 'false',
  });

  const [dbConfig, setDbConfig] = useState({
    dbPath: '',
    backupDir: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettingsAndConfig();
  }, []);

  const fetchSettingsAndConfig = async () => {
    try {
      const db = window.electronAPI;
      // Fetch settings
      const settingsList = await db.invoke('db-query', 'SELECT * FROM settings');
      const settingsMap: any = {};
      settingsList.forEach((row: any) => {
        settingsMap[row.key] = row.value;
      });

      setSettings({
        shop_name: settingsMap.shop_name || '',
        address: settingsMap.address || '',
        gstin: settingsMap.gstin || '',
        state_code: settingsMap.state_code || '',
        invoice_prefix: settingsMap.invoice_prefix || '',
        next_invoice_no: settingsMap.next_invoice_no || '',
        job_prefix: settingsMap.job_prefix || '',
        next_job_no: settingsMap.next_job_no || '',
        default_gst_rate: settingsMap.default_gst_rate || '18',
        printer_type: settingsMap.printer_type || 'A4',
        paper_width: settingsMap.paper_width || '80mm',
        default_copies: settingsMap.default_copies || '1',
        sms_enabled: settingsMap.sms_enabled || 'false',
        sms_tpl_repair_update: settingsMap.sms_tpl_repair_update || 'Job {job_no}: your {product} is {status}.',
        sms_tpl_payment: settingsMap.sms_tpl_payment || 'Received Rs {amount} against Inv {invoice_no}. Thank you!',
        sms_tpl_reminder: settingsMap.sms_tpl_reminder || 'Reminder: Udhaar balance of Rs {balance} is overdue.',
        // X1
        upi_vpa: settingsMap.upi_vpa || '',
        sms_gateway: settingsMap.sms_gateway || 'MOCK',
        sms_gateway_key: settingsMap.sms_gateway_key || '',
        sms_sender_id: settingsMap.sms_sender_id || '',
        whatsapp_api_enabled: settingsMap.whatsapp_api_enabled || 'false',
        whatsapp_api_key: settingsMap.whatsapp_api_key || '',
        perm_CASHIER_EDIT_PRICE: settingsMap.perm_CASHIER_EDIT_PRICE || 'false',
        perm_CASHIER_OVERRIDE_CREDIT: settingsMap.perm_CASHIER_OVERRIDE_CREDIT || 'false',
        perm_CASHIER_ISSUE_CN: settingsMap.perm_CASHIER_ISSUE_CN || 'false',
        perm_CASHIER_VOID_SALE: settingsMap.perm_CASHIER_VOID_SALE || 'false',
      });

      // Fetch DB config
      const config = await db.invoke('get-db-config');
      setDbConfig(config);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const db = window.electronAPI;
      const queries = Object.entries(settings).map(([key, value]) => ({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        params: [key, value, value],
      }));

      await db.invoke('db-transaction', queries);
      
      // Log audit
      const currentUser = 1; // Default System/Owner
      await db.invoke('db-run', 
        'INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
        [currentUser, 'UPDATE', 'settings', 0, 'Updated shop profile and prefixes']
      );

      setMessage({ text: 'Shop settings updated successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: `Failed to save: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBackupDir = async () => {
    try {
      const dir = await window.electronAPI.invoke('select-directory');
      if (dir) {
        const newConfig = await window.electronAPI.invoke('set-db-config', { backupDir: dir });
        setDbConfig(newConfig);
        setMessage({ text: `Backup folder set to: ${dir}`, type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handleManualBackup = async () => {
    setMessage(null);
    try {
      const res = await window.electronAPI.invoke('backup-now');
      setMessage({ text: `Database backup created successfully: ${res}`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: `Backup failed: ${err.message}`, type: 'error' });
    }
  };

  const handleRestoreDatabase = async () => {
    setMessage(null);
    try {
      const file = await window.electronAPI.invoke('select-file', [
        { name: 'SQLite Database', extensions: ['db', 'sqlite'] },
      ]);
      if (!file) return;

      const confirm = window.confirm(
        'WARNING: Restoring the database will replace all current data. A temporary safety backup will be created, and the application database will be overwritten. Do you want to proceed?'
      );
      if (!confirm) return;

      setLoading(true);
      await window.electronAPI.invoke('restore-db', file);
      
      alert('Database restored successfully! The application will refresh.');
      window.location.reload();
    } catch (err: any) {
      setMessage({ text: `Restore failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-amber-400 font-mono uppercase">
          Settings & Backups
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure shop details, invoice numbering schemas, and backup paths.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded border text-sm font-mono ${
            message.type === 'success'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
              : 'bg-red-950/20 border-red-500/30 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile and Prefixes (Form) */}
        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg">
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
              Shop Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Shop Name</label>
                <input
                  type="text"
                  required
                  value={settings.shop_name}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">GSTIN</label>
                <input
                  type="text"
                  required
                  value={settings.gstin}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">State Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 29 for Karnataka"
                  value={settings.state_code}
                  onChange={(e) => setSettings({ ...settings, state_code: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Default GST Rate (%)</label>
                <select
                  value={settings.default_gst_rate}
                  onChange={(e) => setSettings({ ...settings, default_gst_rate: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-zinc-400 uppercase">Shop Address</label>
                <textarea
                  required
                  rows={2}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2 pt-2">
              Printer Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Printer Type</label>
                <select
                  value={settings.printer_type}
                  onChange={(e) => setSettings({ ...settings, printer_type: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="A4">A4 PDF / Inkjet</option>
                  <option value="THERMAL">Thermal ESC/POS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Paper Width</label>
                <select
                  value={settings.paper_width}
                  onChange={(e) => setSettings({ ...settings, paper_width: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="80mm">80mm</option>
                  <option value="58mm">58mm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Default Copies</label>
                <input
                  type="number"
                  value={settings.default_copies}
                  onChange={(e) => setSettings({ ...settings, default_copies: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2 pt-2">
              Sequence & Serial Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Invoice Prefix</label>
                <input
                  type="text"
                  required
                  value={settings.invoice_prefix}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Next Invoice Number</label>
                <input
                  type="number"
                  required
                  value={settings.next_invoice_no}
                  onChange={(e) => setSettings({ ...settings, next_invoice_no: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Job Prefix</label>
                <input
                  type="text"
                  required
                  value={settings.job_prefix}
                  onChange={(e) => setSettings({ ...settings, job_prefix: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Next Job Number</label>
                <input
                  type="number"
                  required
                  value={settings.next_job_no}
                  onChange={(e) => setSettings({ ...settings, next_job_no: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2 pt-2">
              UPI Payment QR
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Shop UPI VPA (e.g. shop@upi)</label>
                <input
                  type="text"
                  placeholder="yourshop@paytm"
                  value={settings.upi_vpa}
                  onChange={(e) => setSettings({ ...settings, upi_vpa: e.target.value })}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-zinc-500">Offline UPI QR will appear on every invoice when set.</span>
              </div>
            </div>

            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2 pt-2">
              SMS / WhatsApp Notifications
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="sms_enabled"
                  checked={settings.sms_enabled === 'true'}
                  onChange={(e) => setSettings({ ...settings, sms_enabled: e.target.checked ? 'true' : 'false' })}
                  className="w-5 h-5 accent-amber-400"
                />
                <label htmlFor="sms_enabled" className="text-sm font-bold text-zinc-200">Enable Offline-Queued Notifications</label>
              </div>

              {settings.sms_enabled === 'true' && (
                <>
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Repair Update Template</label>
                    <textarea
                      rows={2}
                      value={settings.sms_tpl_repair_update}
                      onChange={(e) => setSettings({ ...settings, sms_tpl_repair_update: e.target.value })}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                      placeholder="Job {job_no}: your {product} is {status}."
                    />
                    <span className="text-[10px] text-zinc-500">Vars: {'{job_no}'}, {'{product}'}, {'{status}'}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Payment Receipt Template</label>
                    <textarea
                      rows={2}
                      value={settings.sms_tpl_payment}
                      onChange={(e) => setSettings({ ...settings, sms_tpl_payment: e.target.value })}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                      placeholder="Received Rs {amount} against Inv {invoice_no}. Thank you!"
                    />
                    <span className="text-[10px] text-zinc-500">Vars: {'{amount}'}, {'{invoice_no}'}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Udhaar Reminder Template</label>
                    <textarea
                      rows={2}
                      value={settings.sms_tpl_reminder}
                      onChange={(e) => setSettings({ ...settings, sms_tpl_reminder: e.target.value })}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                      placeholder="Reminder: Udhaar balance of Rs {balance} is overdue."
                    />
                    <span className="text-[10px] text-zinc-500">Vars: {'{balance}'}</span>
                  </div>
                </>
              )}

              {/* SMS Gateway Config */}
              <div className="border-t border-zinc-800 pt-3 mt-2">
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">SMS Gateway Provider</label>
                <select
                  value={settings.sms_gateway}
                  onChange={(e) => setSettings({ ...settings, sms_gateway: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="MOCK">Mock (Dev/Testing)</option>
                  <option value="MSG91">MSG91</option>
                  <option value="GUPSHUP">Gupshup</option>
                </select>
                <span className="text-[10px] text-zinc-500">DLT-registered templates required for production SMS in India.</span>
              </div>

              {settings.sms_gateway !== 'MOCK' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">API Key</label>
                    <input
                      type="password"
                      value={settings.sms_gateway_key}
                      onChange={(e) => setSettings({ ...settings, sms_gateway_key: e.target.value })}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Sender ID</label>
                    <input
                      type="text"
                      placeholder="CHAUHAN"
                      value={settings.sms_sender_id}
                      onChange={(e) => setSettings({ ...settings, sms_sender_id: e.target.value })}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* WhatsApp Business API Config */}
              <div className="border-t border-zinc-800 pt-3 mt-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="whatsapp_api_enabled"
                    checked={settings.whatsapp_api_enabled === 'true'}
                    onChange={(e) => setSettings({ ...settings, whatsapp_api_enabled: e.target.checked ? 'true' : 'false' })}
                    className="w-5 h-5 accent-green-500"
                  />
                  <label htmlFor="whatsapp_api_enabled" className="text-sm font-bold text-zinc-200">Enable WhatsApp Business Cloud API (Auto-Send)</label>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">When OFF, "Send on WhatsApp" opens wa.me deep-link (manual). When ON + API key, messages auto-send.</span>
              </div>

              {settings.whatsapp_api_enabled === 'true' && (
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">WhatsApp Business API Key</label>
                  <input
                    type="password"
                    value={settings.whatsapp_api_key}
                    onChange={(e) => setSettings({ ...settings, whatsapp_api_key: e.target.value })}
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2 pt-2 mt-4">
              Role Permissions (Cashier)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="perm_CASHIER_EDIT_PRICE"
                  checked={settings.perm_CASHIER_EDIT_PRICE === 'true'}
                  onChange={(e) => setSettings({ ...settings, perm_CASHIER_EDIT_PRICE: e.target.checked ? 'true' : 'false' })}
                  className="w-4 h-4 accent-amber-400"
                />
                <label htmlFor="perm_CASHIER_EDIT_PRICE" className="text-sm text-zinc-200">Edit Prices</label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="perm_CASHIER_OVERRIDE_CREDIT"
                  checked={settings.perm_CASHIER_OVERRIDE_CREDIT === 'true'}
                  onChange={(e) => setSettings({ ...settings, perm_CASHIER_OVERRIDE_CREDIT: e.target.checked ? 'true' : 'false' })}
                  className="w-4 h-4 accent-amber-400"
                />
                <label htmlFor="perm_CASHIER_OVERRIDE_CREDIT" className="text-sm text-zinc-200">Override Credit Limit</label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="perm_CASHIER_ISSUE_CN"
                  checked={settings.perm_CASHIER_ISSUE_CN === 'true'}
                  onChange={(e) => setSettings({ ...settings, perm_CASHIER_ISSUE_CN: e.target.checked ? 'true' : 'false' })}
                  className="w-4 h-4 accent-amber-400"
                />
                <label htmlFor="perm_CASHIER_ISSUE_CN" className="text-sm text-zinc-200">Issue Credit Notes</label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="perm_CASHIER_VOID_SALE"
                  checked={settings.perm_CASHIER_VOID_SALE === 'true'}
                  onChange={(e) => setSettings({ ...settings, perm_CASHIER_VOID_SALE: e.target.checked ? 'true' : 'false' })}
                  className="w-4 h-4 accent-amber-400"
                />
                <label htmlFor="perm_CASHIER_VOID_SALE" className="text-sm text-zinc-200">Cancel/Void Sales</label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded text-sm transition-colors"
              >
                <Save size={16} />
                <span>{loading ? 'Saving...' : 'Save Config'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Database & Backups panel */}
        <div className="space-y-6">
          <div className="border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg space-y-4">
            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
              Database Core
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 font-mono">ACTIVE FILE PATH:</span>
                <p className="font-mono text-zinc-200 mt-1 select-all break-all bg-zinc-950 p-2 rounded border border-zinc-900">
                  {dbConfig.dbPath}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 font-mono">BACKUP TARGET DIRECTORY:</span>
                {dbConfig.backupDir ? (
                  <p className="font-mono text-zinc-200 mt-1 select-all break-all bg-zinc-950 p-2 rounded border border-zinc-900">
                    {dbConfig.backupDir}
                  </p>
                ) : (
                  <p className="text-red-400 font-mono mt-1 italic">Not Configured (Auto-backup disabled)</p>
                )}
              </div>
              <button
                onClick={handleSelectBackupDir}
                className="flex items-center space-x-2 w-full justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold px-3 py-2 rounded transition-colors"
              >
                <FolderOpen size={14} />
                <span>Select Backup Folder</span>
              </button>
            </div>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg space-y-4">
            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
              Data Portability & Safe Exports
            </h2>
            <div className="space-y-3 pt-2">
              <button
                onClick={async () => {
                  const res = await window.electronAPI.invoke('backup-database');
                  if (res.success) setMessage({ text: `Backup saved to ${res.filePath}`, type: 'success' });
                  else if (res.error !== 'Canceled') setMessage({ text: `Backup failed: ${res.error}`, type: 'error' });
                }}
                className="flex items-center space-x-2 w-full justify-center bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-3 py-2 rounded transition-colors"
              >
                <Database size={14} />
                <span>Save Full DB Backup</span>
              </button>

              <button
                onClick={async () => {
                  const res = await window.electronAPI.invoke('export-csv', 'sales');
                  if (res.success) setMessage({ text: `Sales exported to ${res.filePath}`, type: 'success' });
                  else if (res.error !== 'Canceled') setMessage({ text: `Export failed: ${res.error}`, type: 'error' });
                }}
                className="flex items-center space-x-2 w-full justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-2 rounded transition-colors"
              >
                <span>Export Sales (CSV)</span>
              </button>

              <button
                onClick={async () => {
                  const res = await window.electronAPI.invoke('export-csv', 'customers');
                  if (res.success) setMessage({ text: `Customers exported to ${res.filePath}`, type: 'success' });
                  else if (res.error !== 'Canceled') setMessage({ text: `Export failed: ${res.error}`, type: 'error' });
                }}
                className="flex items-center space-x-2 w-full justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-2 rounded transition-colors"
              >
                <span>Export Customers (CSV)</span>
              </button>

              <button
                onClick={async () => {
                  const res = await window.electronAPI.invoke('export-csv', 'products');
                  if (res.success) setMessage({ text: `Catalogue exported to ${res.filePath}`, type: 'success' });
                  else if (res.error !== 'Canceled') setMessage({ text: `Export failed: ${res.error}`, type: 'error' });
                }}
                className="flex items-center space-x-2 w-full justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-2 rounded transition-colors"
              >
                <span>Export Catalogue (CSV)</span>
              </button>
            </div>
            <div className="flex items-start space-x-1.5 text-[10px] text-zinc-500 pt-2 border-t border-zinc-850/50">
              <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span>Database backups are 100% safe to run even during active sales.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
