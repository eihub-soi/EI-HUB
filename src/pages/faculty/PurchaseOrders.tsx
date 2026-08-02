import React, { useState } from 'react';
import { mockEngine } from '../../services/mockEngine';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateOnly, parseUTCDate } from '../../utils/timestamp';
import { PurchaseOrder, ComponentCategory } from '../../types';
import { toast } from 'sonner';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  X, 
  Building2, 
  Boxes,
  FileText,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';

export const PurchaseOrders: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(mockEngine.getPurchases());
  const [components] = useState(mockEngine.getComponents());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Actions state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsPO, setSelectedDetailsPO] = useState<PurchaseOrder | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  // Form State (Start empty so user enters their own data manually)
  const [selectedComponentId, setSelectedComponentId] = useState<string>('custom');
  const [customComponentName, setCustomComponentName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('Microcontrollers');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [cabinet, setCabinet] = useState('');
  const [shelf, setShelf] = useState('');

  const handleOpenEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setSelectedComponentId(po.component_id || 'custom');
    setCustomComponentName(po.component_name);
    setSupplierName(po.supplier_name);
    setCategory(po.component_category);
    setQuantity(po.quantity);
    setUnitCost(po.unit_cost);
    setInvoiceRef(po.invoice_ref || '');
    setCabinet(po.cabinet || '');
    setShelf(po.shelf || '');
    setShowEditModal(true);
  };

  const handleEditPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;
    try {
      await mockEngine.updatePurchaseOrder(editingPO.id, {
        supplier_name: supplierName,
        quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
        invoice_ref: invoiceRef,
        cabinet,
        shelf,
      });
      toast.success('Purchase order updated successfully!');
      setPurchases(mockEngine.getPurchases());
      setShowEditModal(false);
      setEditingPO(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update purchase order');
    }
  };

  const handleDeletePO = async (po: PurchaseOrder) => {
    if (window.confirm(`Are you sure you want to delete purchase order ${po.po_number}?`)) {
      try {
        await mockEngine.deletePurchaseOrder(po.id);
        toast.success('Purchase order deleted!');
        setPurchases(mockEngine.getPurchases());
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete purchase order');
      }
    }
  };

  const sortedPurchases = [...purchases].sort((a, b) => {
    const dateA = parseUTCDate(a.purchased_at || a.created_at).getTime();
    const dateB = parseUTCDate(b.purchased_at || b.created_at).getTime();
    return dateB - dateA;
  });

  const filteredPurchases = sortedPurchases.filter(
    (p) =>
      p.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.component_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCostSum = purchases.reduce((acc, p) => acc + p.total_cost, 0);
  const totalUnitsSum = purchases.reduce((acc, p) => acc + p.quantity, 0);

  const handleComponentSelectChange = (compId: string) => {
    setSelectedComponentId(compId);
    if (compId !== 'custom') {
      const found = components.find((c) => c.id === compId);
      if (found) {
        setCategory(found.category);
        setUnitCost(found.unit_cost);
        setCabinet(found.cabinet);
        setShelf(found.shelf);
      }
    }
  };

  const handleCreatePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let compName = customComponentName;
    if (selectedComponentId !== 'custom') {
      const found = components.find((c) => c.id === selectedComponentId);
      if (found) compName = found.name;
    }

    if (!compName.trim()) {
      toast.error('Please specify component name');
      return;
    }

    try {
      mockEngine.addPurchaseOrder({
        component_id: selectedComponentId === 'custom' ? '' : selectedComponentId,
        component_name: compName,
        component_category: category,
        supplier_name: supplierName,
        quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
        purchased_by: user?.id || 'usr-faculty-1',
        purchased_by_name: user?.full_name || 'Prof. Robert Chen',
        invoice_ref: invoiceRef,
        cabinet,
        shelf,
      });

      toast.success(`Purchase order confirmed! Added ${quantity}x ${compName} directly to stock!`);
      setPurchases(mockEngine.getPurchases());
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create purchase order');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Stock Purchase & Procurement Orders</h1>
          <p className="text-xs text-slate-400 mt-0.5">Procure hardware stock from suppliers and automatically update inventory stock counts</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-indigo-glow transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> Create Purchase Order
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-1">
          <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-indigo-400" /> Total Purchase Orders
          </p>
          <h3 className="text-2xl font-extrabold text-white">{purchases.length} Orders</h3>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-1">
          <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Total Expenditure
          </p>
          <h3 className="text-2xl font-extrabold text-emerald-400">₹{totalCostSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-1">
          <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-gold-400" /> Units Procured & Stocked
          </p>
          <h3 className="text-2xl font-extrabold text-gold-300">+{totalUnitsSum} Units</h3>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl glass-card border border-white/10 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PO code, supplier name, or component..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl glass-input text-xs"
          />
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-6">PO Number</th>
                <th className="py-3.5 px-6">Component Purchased</th>
                <th className="py-3.5 px-6">Supplier</th>
                <th className="py-3.5 px-6">Qty</th>
                <th className="py-3.5 px-6">Unit / Total Cost</th>
                <th className="py-3.5 px-6">Storage Rack</th>
                <th className="py-3.5 px-6">Purchased By</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredPurchases.map((po) => (
                <tr key={po.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-indigo-300">{po.po_number}</td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-white">{po.component_name}</p>
                    <p className="text-[10px] text-slate-400">{po.component_category}</p>
                  </td>
                  <td className="py-4 px-6 text-slate-300 font-semibold">{po.supplier_name}</td>
                  <td className="py-4 px-6 font-extrabold text-emerald-400">+{po.quantity}</td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-white">₹{po.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-slate-400">₹{po.unit_cost.toFixed(2)} / unit</p>
                  </td>
                  <td className="py-4 px-6 text-slate-400">{po.cabinet}, {po.shelf}</td>
                  <td className="py-4 px-6 text-slate-300">{po.purchased_by_name}</td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" /> Delivered & Stocked
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedDetailsPO(po);
                          setShowDetailsModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(po)}
                        className="p-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-600 transition-colors"
                        title="Edit PO"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePO(po)}
                        className="p-1.5 rounded-lg bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
                        title="Delete PO"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg glass-card p-6 border border-white/20 shadow-2xl rounded-3xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" /> New Hardware Purchase Order
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Hardware Component</label>
                <select
                  value={selectedComponentId}
                  onChange={(e) => handleComponentSelectChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                >
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.category}) - Current Stock: {c.total_stock}
                    </option>
                  ))}
                  <option value="custom">+ Add New Unlisted Component</option>
                </select>
              </div>

              {selectedComponentId === 'custom' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Component Name</label>
                  <input
                    type="text"
                    value={customComponentName}
                    onChange={(e) => setCustomComponentName(e.target.value)}
                    placeholder="E.g. Raspberry Pi Pico W"
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Element14 / Mouser / RS"
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Invoice Ref / Code</label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantity Purchased</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit Cost (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Destination Cabinet</label>
                  <input
                    type="text"
                    value={cabinet}
                    onChange={(e) => setCabinet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={shelf}
                    onChange={(e) => setShelf(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-[11px]">
                <span>Total Purchase Order Cost:</span>
                <span className="font-extrabold text-sm">₹{(quantity * unitCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-indigo-glow">
                  Confirm Purchase & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Purchase Order Details Modal */}
      {showDetailsModal && selectedDetailsPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-card p-6 border border-white/20 shadow-2xl rounded-3xl space-y-5 max-h-[90vh] overflow-y-auto bg-slate-900/90 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" /> Purchase Order Details
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 font-mono font-bold text-sm">
                  PO
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedDetailsPO.po_number}</h4>
                  <p className="text-[10px] text-slate-400">Purchased at {selectedDetailsPO.purchased_at ? formatDateOnly(selectedDetailsPO.purchased_at) : 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/30 border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Component Name</span>
                    <span className="font-semibold text-white">{selectedDetailsPO.component_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Category</span>
                    <span className="font-semibold text-white">{selectedDetailsPO.component_category}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/30 border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Supplier</span>
                    <span className="font-semibold text-white">{selectedDetailsPO.supplier_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Invoice Reference</span>
                    <span className="font-semibold text-white font-mono">{selectedDetailsPO.invoice_ref || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/30 border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Quantity Purchased</span>
                    <span className="font-semibold text-emerald-400 font-mono">+{selectedDetailsPO.quantity} units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Storage Rack Location</span>
                    <span className="font-semibold text-white">{selectedDetailsPO.cabinet || 'N/A'}, {selectedDetailsPO.shelf || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/30 border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Unit Cost</span>
                    <span className="font-semibold text-white">₹{selectedDetailsPO.unit_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Expenditure</span>
                    <span className="font-semibold text-emerald-400">₹{selectedDetailsPO.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 p-3 rounded-2xl bg-slate-900/30 border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Purchased By</span>
                    <span className="font-semibold text-indigo-300">{selectedDetailsPO.purchased_by_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowDetailsModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
                >
                  Close Detail Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Order Modal */}
      {showEditModal && editingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg glass-card p-6 border border-white/20 shadow-2xl rounded-3xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" /> Edit Purchase Order
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditPurchaseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Component Purchased</label>
                <input
                  type="text"
                  value={customComponentName}
                  disabled
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-400 cursor-not-allowed bg-slate-950/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Element14 / Mouser / RS"
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Invoice Ref / Code</label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantity Purchased</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit Cost (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Destination Cabinet</label>
                  <input
                    type="text"
                    value={cabinet}
                    onChange={(e) => setCabinet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={shelf}
                    onChange={(e) => setShelf(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-[11px]">
                <span>Total Purchase Order Cost:</span>
                <span className="font-extrabold text-sm">₹{(quantity * unitCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-indigo-glow">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
