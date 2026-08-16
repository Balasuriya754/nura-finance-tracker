import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, UploadCloud, Receipt, Loader2, Save } from 'lucide-react';
import api from '../services/api';
import CameraModal from '../components/CameraModal';

const AddExpense = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    main_category: 'Operations',
    sub_category: '',
    vendor: '',
    gst_bill: false,
    paid_using: 'PERSONAL',
    payment_method: 'UPI',
    expense_date: Date.now(),
    bill_url: null
  });

  const subCategoryOptions = ['customer ops', 'employee ops', 'ai services', 'lunch vendor', 'care taker agency'];

  const sharedId = queryParams.get('shared_id');

  useEffect(() => {
    const handleSharedId = async () => {
      if (sharedId) {
        setLoading(true);
        try {
          // Fetch raw image data as Blob
          const res = await api.get(`/expenses/shared-file/${sharedId}`, { responseType: 'blob' });
          
          // Create File from Blob
          const filename = res.headers['content-disposition'] 
            ? res.headers['content-disposition'].split('filename=')[1]?.replace(/"/g, '') || 'shared_receipt.jpg'
            : 'shared_receipt.jpg';
            
          const sharedFile = new File([res.data], filename, { type: res.data.type });
          
          // Set in local state
          const objectUrl = URL.createObjectURL(sharedFile);
          setPreviewUrl(objectUrl);
          setFile(sharedFile);
          
          // Clean up URL without remounting
          navigate('/add-expense', { replace: true });
          
          // Tell backend to delete the temporary file
          await api.delete(`/expenses/shared-file/${sharedId}`);
          
        } catch (err) {
          console.error('Failed to claim shared file', err);
        } finally {
          setLoading(false);
        }
      }
    };

    // 1. Check for shared file from backend share-target first
    if (sharedId) {
      handleSharedId();
      return;
    }

    // 2. Fallback to old IndexedDB check for Service Worker Web Share Target
    const checkSharedFile = () => {
      const request = indexedDB.open('finance_tracker_db', 1);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('shared_files')) {
          db.createObjectStore('shared_files');
        }
      };

      request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('shared_files')) return;
        
        const tx = db.transaction('shared_files', 'readwrite');
        const store = tx.objectStore('shared_files');
        const getReq = store.get('latest_shared_file');
        
        getReq.onsuccess = () => {
          const sharedFile = getReq.result;
          if (sharedFile) {
            const objectUrl = URL.createObjectURL(sharedFile);
            setPreviewUrl(objectUrl);
            setFile(sharedFile);
            store.delete('latest_shared_file');
          }
        };
      };
    };

    checkSharedFile();

    // 3. Normal edit/draft logic
    if (editId === 'local-draft') {
      const savedDraft = localStorage.getItem('local_draft');
      if (savedDraft) {
        setFormData(JSON.parse(savedDraft));
      }
    } else if (editId) {
      fetchExpenseData();
    }
  }, [editId, sharedId]);

  const fetchExpenseData = async () => {
    try {
      const res = await api.get('/expenses/');
      const expenseToEdit = res.data.find(e => e.uuid === editId);
      if (expenseToEdit) {
        setFormData({
          description: expenseToEdit.description,
          amount: expenseToEdit.amount,
          main_category: expenseToEdit.main_category || 'Operations',
          sub_category: expenseToEdit.sub_category || '',
          vendor: expenseToEdit.vendor || '',
          gst_bill: expenseToEdit.gst_bill || false,
          paid_using: expenseToEdit.paid_using,
          payment_method: expenseToEdit.payment_method,
          expense_date: expenseToEdit.expense_date,
          bill_url: expenseToEdit.bill_url
        });
        setPreviewUrl(expenseToEdit.bill_url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setFile(selectedFile);
  };

  const handleCapture = (capturedFile) => {
    if (!capturedFile) return;
    const objectUrl = URL.createObjectURL(capturedFile);
    setPreviewUrl(objectUrl);
    setFile(capturedFile);
  };

  const handleSubmit = async (status) => {
    if (status === 'DRAFT') {
      // Save locally and bypass validation
      localStorage.setItem('local_draft', JSON.stringify(formData));
      navigate('/');
      return;
    }

    if (!formData.description || !formData.amount) {
      alert("Please fill description and amount");
      return;
    }
    
    setSubmitting(true);

    try {
      if (editId && editId !== 'local-draft') {
        // PUT request uses JSON
        const payload = {
          ...formData,
          review_status: status,
          amount: parseFloat(formData.amount)
        };
        await api.put(`/expenses/${editId}`, payload);
      } else {
        // POST request uses multipart/form-data
        const data = new FormData();
        if (file) {
          data.append('file', file);
        }
        data.append('description', formData.description);
        data.append('amount', formData.amount);
        data.append('main_category', formData.main_category);
        data.append('sub_category', formData.sub_category);
        data.append('vendor', formData.vendor);
        data.append('gst_bill', formData.gst_bill);
        data.append('paid_using', formData.paid_using);
        data.append('payment_method', formData.payment_method);
        data.append('expense_date', formData.expense_date);
        data.append('review_status', status);

        await api.post('/expenses/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (editId === 'local-draft') {
          localStorage.removeItem('local_draft');
        }
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-medium text-slate-900 tracking-tight">{editId ? 'Edit Expense' : 'New Expense'}</h1>
          </div>
          <button 
            onClick={() => handleSubmit('DRAFT')}
            disabled={submitting}
            className="text-slate-600 hover:text-slate-900 font-medium text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> <span className="hidden sm:inline">Save Draft</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm ring-1 ring-slate-200">
          
          {/* Step 1: Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-900 mb-3">Receipt / Bill</label>
            
            {!previewUrl ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsCameraOpen(true)}
                  className="border border-dashed border-slate-300 bg-slate-50 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-100 transition-colors focus:outline-none"
                >
                  <Camera className="w-6 h-6 mb-3 text-slate-400" />
                  <span className="text-sm font-medium">Take Photo</span>
                </button>
                
                <label className="border border-dashed border-slate-300 bg-slate-50 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-100 cursor-pointer transition-colors">
                  <UploadCloud className="w-6 h-6 mb-3 text-slate-400" />
                  <span className="text-sm font-medium">Upload File</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center group">
                {loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
                  </div>
                )}
                {previewUrl.includes('.pdf') ? (
                  <div className="flex flex-col items-center text-slate-500">
                    <Receipt className="w-10 h-10 mb-2 text-slate-400" />
                    <span className="text-sm font-medium">PDF Document</span>
                  </div>
                ) : (
                  <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-contain" />
                )}
                <label className="absolute bottom-4 right-4 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer shadow-sm transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  Replace File
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}
          </div>

          <hr className="border-slate-100 my-8" />

          {/* Step 2: Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">Description <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="e.g. Printer ink for office"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">Amount (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-slate-500 font-medium sm:text-sm">₹</span>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow font-medium text-slate-900 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">Main Category <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={formData.main_category}
                  onChange={(e) => setFormData({...formData, main_category: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow sm:text-sm appearance-none"
                >
                  <option value="Operations">Operations</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="HR">HR</option>
                  <option value="Customer Service">Customer Service</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">Sub Category <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  list="subCategories"
                  value={formData.sub_category}
                  onChange={(e) => setFormData({...formData, sub_category: e.target.value})}
                  placeholder="e.g. Lunch"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow sm:text-sm"
                />
                <datalist id="subCategories">
                  {subCategoryOptions.map(option => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">Vendor <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={formData.vendor}
                  onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                  placeholder="Vendor Name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">GST Bill? <span className="text-red-500">*</span></label>
                <div className="flex gap-6 mt-3 h-full items-start">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="gst_bill" 
                      checked={formData.gst_bill === true} 
                      onChange={() => setFormData({...formData, gst_bill: true})}
                      className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="gst_bill" 
                      checked={formData.gst_bill === false} 
                      onChange={() => setFormData({...formData, gst_bill: false})}
                      className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">No</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">Paid Using <span className="text-red-500">*</span></label>
                <select 
                  value={formData.paid_using}
                  onChange={(e) => setFormData({...formData, paid_using: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow sm:text-sm appearance-none"
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="COMPANY">Company</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">Payment Method <span className="text-red-500">*</span></label>
                <select 
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow sm:text-sm appearance-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
            </div>
            
            {formData.paid_using === 'PERSONAL' && (
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 flex items-start gap-3 mt-2">
                <div className="bg-slate-200 p-1.5 rounded text-slate-700 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-slate-900 font-medium">Reimbursement requested</p>
                  <p className="text-sm text-slate-600 mt-0.5">Since you paid using personal funds, a reimbursement request will be automatically created upon submission.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-20">
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={() => handleSubmit('PENDING')}
            disabled={submitting || loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-medium py-3 px-6 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {submitting ? 'Submitting...' : 'Submit Expense'}
          </button>
        </div>
      </div>

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCapture} 
      />
    </div>
  );
};

export default AddExpense;
