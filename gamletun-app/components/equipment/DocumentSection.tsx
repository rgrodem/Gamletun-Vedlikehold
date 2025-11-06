'use client';

import { useState, useEffect } from 'react';
import { FaFileAlt, FaFilePdf, FaFileWord, FaFileExcel, FaImage, FaTrash, FaDownload, FaPlus } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, deleteFile, formatFileSize } from '@/lib/storage';

interface EquipmentDocument {
  id: string;
  equipment_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  document_type: string | null;
  description: string | null;
  created_at: string;
}

interface DocumentSectionProps {
  equipmentId: string;
  onUpdate?: () => void;
}

export default function DocumentSection({ equipmentId, onUpdate }: DocumentSectionProps) {
  const [documents, setDocuments] = useState<EquipmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [documentType, setDocumentType] = useState('other');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadDocuments();
  }, [equipmentId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_documents')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Filen er for stor. Maksimal størrelse er 10 MB.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const result = await uploadFile('equipment-documents', selectedFile, equipmentId);

      // Save document record to database
      const { error } = await supabase
        .from('equipment_documents')
        .insert({
          equipment_id: equipmentId,
          file_name: selectedFile.name,
          file_path: result.path,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          document_type: documentType,
          description: description || null,
        });

      if (error) throw error;

      // Reset form
      setSelectedFile(null);
      setDescription('');
      setDocumentType('other');
      setShowUploadForm(false);

      // Reload documents
      await loadDocuments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Feil ved opplasting av dokument. Prøv igjen.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: EquipmentDocument) => {
    if (!confirm(`Er du sikker på at du vil slette "${doc.file_name}"?`)) return;

    try {
      // Delete from storage
      await deleteFile('equipment-documents', doc.file_path);

      // Delete from database
      const { error } = await supabase
        .from('equipment_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      // Reload documents
      await loadDocuments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Feil ved sletting av dokument. Prøv igjen.');
    }
  };

  const handleDownload = async (doc: EquipmentDocument) => {
    try {
      const { data } = supabase.storage
        .from('equipment-documents')
        .getPublicUrl(doc.file_path);

      // Create a temporary link and click it to download
      const link = document.createElement('a');
      link.href = data.publicUrl;
      link.download = doc.file_name;
      link.click();
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Feil ved nedlasting av dokument.');
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FaFileAlt className="text-gray-500" />;

    if (fileType.startsWith('image/')) return <FaImage className="text-blue-500" />;
    if (fileType === 'application/pdf') return <FaFilePdf className="text-red-500" />;
    if (fileType.includes('word')) return <FaFileWord className="text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FaFileExcel className="text-green-600" />;

    return <FaFileAlt className="text-gray-500" />;
  };

  const getDocumentTypeName = (type: string | null) => {
    switch (type) {
      case 'certificate': return 'Sertifikat';
      case 'manual': return 'Bruksanvisning';
      case 'vehicle_card': return 'Vognkort';
      case 'drawing': return 'Tegning';
      case 'other': return 'Annet';
      default: return 'Dokument';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Laster dokumenter...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dokumenter</h2>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-200 font-medium touch-manipulation min-h-[44px]"
        >
          <FaPlus />
          <span>Last opp</span>
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Last opp nytt dokument</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumenttype
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px]"
              >
                <option value="certificate">Sertifikat (EU-kontroll, godkjenninger)</option>
                <option value="manual">Bruksanvisning</option>
                <option value="vehicle_card">Vognkort</option>
                <option value="drawing">Tegning/Skisse</option>
                <option value="other">Annet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beskrivelse (valgfritt)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="F.eks. EU-kontroll 2024, Bruksanvisning norsk, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Velg fil (max 10 MB)
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px]"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Valgt: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium touch-manipulation min-h-[44px]"
              >
                {uploading ? 'Laster opp...' : 'Last opp'}
              </button>
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setSelectedFile(null);
                  setDescription('');
                  setDocumentType('other');
                }}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium touch-manipulation min-h-[44px]"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FaFileAlt className="text-4xl mx-auto mb-3 text-gray-300" />
          <p>Ingen dokumenter lastet opp ennå</p>
          <p className="text-sm mt-1">Last opp sertifikater, manualer, vognkort, og andre dokumenter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="text-2xl">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.file_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
                      {getDocumentTypeName(doc.document_type)}
                    </span>
                    {doc.file_size && (
                      <span className="text-xs text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('nb-NO')}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all touch-manipulation min-h-[44px] min-w-[44px]"
                  aria-label="Last ned"
                >
                  <FaDownload />
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all touch-manipulation min-h-[44px] min-w-[44px]"
                  aria-label="Slett"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
