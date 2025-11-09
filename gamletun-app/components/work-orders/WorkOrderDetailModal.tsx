'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaEdit, FaTrash, FaComment, FaExclamationTriangle, FaPlay, FaPause, FaCheckCircle } from 'react-icons/fa';
import {
  WorkOrder,
  WorkOrderComment,
  WorkOrderStatus,
  getWorkOrderComments,
  addWorkOrderComment,
  updateWorkOrder,
  deleteWorkOrder,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  typeLabels
} from '@/lib/work-orders';

interface WorkOrderDetailModalProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WorkOrderDetailModal({ workOrder, onClose, onUpdate }: WorkOrderDetailModalProps) {
  const [comments, setComments] = useState<WorkOrderComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(workOrder.title);
  const [editedDescription, setEditedDescription] = useState(workOrder.description || '');

  useEffect(() => {
    loadComments();
  }, [workOrder.id]);

  const loadComments = async () => {
    try {
      const data = await getWorkOrderComments(workOrder.id);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await addWorkOrderComment(workOrder.id, newComment);
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Kunne ikke legge til kommentar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateWorkOrder(workOrder.id, {
        title: editedTitle,
        description: editedDescription || null,
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating work order:', error);
      alert('Kunne ikke oppdatere arbeidsordre');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Er du sikker på at du vil slette denne arbeidsordren?')) return;

    try {
      await deleteWorkOrder(workOrder.id);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting work order:', error);
      alert('Kunne ikke slette arbeidsordre');
    }
  };

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    try {
      await updateWorkOrder(workOrder.id, { status: newStatus });
      await addWorkOrderComment(
        workOrder.id,
        `Status endret fra ${statusLabels[workOrder.status]} til ${statusLabels[newStatus]}`,
        workOrder.status,
        newStatus
      );
      onUpdate();
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Kunne ikke endre status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-start justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex-1 pr-4">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Tittel"
                />
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Beskrivelse"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Lagre
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedTitle(workOrder.title);
                      setEditedDescription(workOrder.description || '');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{workOrder.title}</h2>
                {workOrder.description && (
                  <p className="text-gray-600 text-sm">{workOrder.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${statusColors[workOrder.status]}`}>
                    {statusLabels[workOrder.status]}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium border bg-white ${priorityColors[workOrder.priority]}`}>
                    {priorityLabels[workOrder.priority]}
                  </span>
                  {workOrder.is_recurring && (
                    <span className="text-xs text-blue-600 font-medium">🔄 Gjentas</span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!isEditing && !['completed', 'closed'].includes(workOrder.status) && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Rediger"
                >
                  <FaEdit className="text-gray-600" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Slett"
                >
                  <FaTrash className="text-red-600" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Lukk"
            >
              <FaTimes className="text-gray-500 text-xl" />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-6">
          {/* Status Change Section */}
          {!['completed', 'closed'].includes(workOrder.status) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Endre status</h3>
              <div className="flex flex-wrap gap-2">
                {workOrder.status !== 'open' && (
                  <button
                    onClick={() => handleStatusChange('open')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    <FaPause className="text-sm" />
                    <span>Tilbake til Åpen</span>
                  </button>
                )}
                {workOrder.status === 'open' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    <FaPlay className="text-sm" />
                    <span>Start arbeid</span>
                  </button>
                )}
                {workOrder.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange('waiting_parts')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium text-sm"
                  >
                    <FaPause className="text-sm" />
                    <span>Venter deler</span>
                  </button>
                )}
                {workOrder.status === 'waiting_parts' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    <FaPlay className="text-sm" />
                    <span>Fortsett arbeid</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Nåværende status: <span className="font-semibold">{statusLabels[workOrder.status]}</span>
              </p>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="text-sm font-medium text-gray-900">{typeLabels[workOrder.type]}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Utstyr</p>
              <p className="text-sm font-medium text-gray-900">{workOrder.equipment?.name || 'Ukjent'}</p>
            </div>
            {workOrder.due_date && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Forfallsdato</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(workOrder.due_date).toLocaleDateString('nb-NO')}
                </p>
              </div>
            )}
            {workOrder.estimated_hours && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Estimerte timer</p>
                <p className="text-sm font-medium text-gray-900">{workOrder.estimated_hours} t</p>
              </div>
            )}
            {workOrder.estimated_cost && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Estimert kostnad</p>
                <p className="text-sm font-medium text-gray-900">{workOrder.estimated_cost} kr</p>
              </div>
            )}
            {workOrder.actual_hours && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Faktiske timer</p>
                <p className="text-sm font-medium text-green-700">{workOrder.actual_hours} t</p>
              </div>
            )}
            {workOrder.actual_cost && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Faktisk kostnad</p>
                <p className="text-sm font-medium text-green-700">{workOrder.actual_cost} kr</p>
              </div>
            )}
          </div>

          {/* Checklist */}
          {workOrder.checklist && workOrder.checklist.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sjekkliste</h3>
              <div className="space-y-2">
                {workOrder.checklist.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${item.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                      {item.task}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaComment className="text-blue-600" />
              Kommentarer ({comments.length})
            </h3>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Skriv en kommentar..."
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {submitting ? 'Legger til...' : 'Legg til kommentar'}
              </button>
            </form>

            {/* Comments List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 h-20"></div>
                ))}
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {comment.status_change_from && comment.status_change_to && (
                      <div className="flex items-center gap-2 mb-2 text-xs text-blue-700 font-medium">
                        <FaExclamationTriangle />
                        Status endret: {statusLabels[comment.status_change_from as keyof typeof statusLabels]} → {statusLabels[comment.status_change_to as keyof typeof statusLabels]}
                      </div>
                    )}
                    <p className="text-sm text-gray-900 mb-2">{comment.comment}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(comment.created_at)}</span>
                      {comment.user_profile && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{comment.user_profile.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Ingen kommentarer ennå</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
