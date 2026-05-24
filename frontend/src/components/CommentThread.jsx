import React, { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getComments, postComment, updateComment, deleteComment } from '../api/records'
import { useAuth } from '../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'

const getInitials = (name) => {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const CommentThread = ({ recordId }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [newBody, setNewBody] = useState('')
  const [isInternal, setIsInternal] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const textareaRef = useRef(null)
  const threadRef = useRef(null)

  const isOwnComment = useCallback(
    (comment) => {
      if (!user || !comment) return false
      const author = (comment.author || '').trim().toLowerCase()
      const userName = (user.name || '').trim().toLowerCase()
      const userEmail = (user.email || '').trim().toLowerCase()
      return author === userName || author === userEmail
    },
    [user]
  )

  const autoGrow = useCallback((el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const { data: comments, isLoading, isError } = useQuery({
    queryKey: ['comments', recordId],
    queryFn: () => getComments(recordId),
    enabled: !!recordId,
  })

  const postMutation = useMutation({
    mutationFn: (data) => postComment(recordId, data),
    onSuccess: (createdComment) => {
      queryClient.setQueryData(['comments', recordId], (current = []) => [...current, createdComment])
      setNewBody('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ commentId, data }) => updateComment(recordId, commentId, data),
    onSuccess: (updatedComment) => {
      queryClient.setQueryData(['comments', recordId], (current = []) =>
        current.map((comment) => (comment.id === updatedComment.id ? updatedComment : comment))
      )
      setEditingId(null)
      setEditBody('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId) => deleteComment(recordId, commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData(['comments', recordId], (current = []) =>
        current.filter((comment) => comment.id !== commentId)
      )
    },
  })

  const handlePost = () => {
    if (!newBody.trim()) return
    postMutation.mutate({ body: newBody.trim(), is_internal: isInternal })
  }

  const handleDelete = (commentId) => {
    if (window.confirm('Delete this comment? This cannot be undone.')) {
      deleteMutation.mutate(commentId)
    }
  }

  const handleEditSave = (commentId) => {
    if (!editBody.trim()) return
    updateMutation.mutate({ commentId, data: { body: editBody.trim() } })
  }

  const handleEditKeyDown = (event, commentId) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleEditSave(commentId)
    }
  }

  const startEdit = (comment) => {
    setEditingId(comment.id)
    setEditBody(comment.body)
  }

  const commentCount = comments?.length || 0

  return (
    <div ref={threadRef} id="comments-section" className="space-y-4 text-left border-t border-gray-100 pt-6">
      <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
        Notes {commentCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[10px] text-slate-600">
            {commentCount}
          </span>
        )}
      </h3>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-red-500 font-medium">Failed to load comments.</p>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50 border border-gray-200 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-slate-600">
                    {getInitials(comment.author)}
                  </span>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-900">{comment.author || 'Unknown'}</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : ''}
                    </span>
                    {comment.is_internal && (
                      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Internal
                      </span>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => {
                          setEditBody(e.target.value)
                          autoGrow(e.target)
                        }}
                        onKeyDown={(e) => handleEditKeyDown(e, comment.id)}
                        className="w-full text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none overflow-hidden"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(comment.id)}
                          disabled={updateMutation.isPending}
                          className="px-2.5 py-1 bg-[#115e59] text-white text-[10px] font-bold rounded-lg hover:bg-[#0f766e] disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditBody('')
                          }}
                          className="px-2.5 py-1 border border-gray-300 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700 font-medium mt-1 leading-relaxed whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  )}
                </div>

                {isOwnComment(comment) && editingId !== comment.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(comment)}
                      className="p-1 text-gray-300 hover:text-gray-600 rounded hover:bg-slate-100"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 disabled:opacity-50"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic py-2">No notes yet.</p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
        <textarea
          ref={textareaRef}
          value={newBody}
          onChange={(e) => {
            setNewBody(e.target.value)
            autoGrow(e.target)
          }}
          placeholder="Add a note..."
          className="w-full text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none overflow-hidden placeholder-gray-400"
          rows={2}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
            />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Internal only</span>
          </label>
          <button
            onClick={handlePost}
            disabled={!newBody.trim() || postMutation.isPending}
            className="px-3 py-1.5 bg-[#115e59] text-white text-xs font-bold rounded-lg hover:bg-[#0f766e] shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {postMutation.isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CommentThread
