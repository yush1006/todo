import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableTodoItem({ todo, toggleTodo, deleteTodo, formatDateTime, formatDuration }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
  };

  return (
    <li 
      ref={setNodeRef} 
      style={style} 
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div className="todo-main">
        {/* 드래그 핸들 (선택 사항이지만 기본적으로 리스트 자체를 핸들로 사용) */}
        <div className="drag-handle" {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: '10px', display: 'flex', alignItems: 'center', color: '#888' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="5" r="1"></circle>
            <circle cx="9" cy="12" r="1"></circle>
            <circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="5" r="1"></circle>
            <circle cx="15" cy="12" r="1"></circle>
            <circle cx="15" cy="19" r="1"></circle>
          </svg>
        </div>

        <label className="checkbox-container">
          <input 
            type="checkbox" 
            checked={todo.completed} 
            onChange={() => toggleTodo(todo.id)}
            className="todo-checkbox"
          />
          <span className="checkmark"></span>
        </label>
        <div className="todo-content" onClick={() => toggleTodo(todo.id)}>
          <span className="todo-text">{todo.text}</span>
          <div className="todo-time-info">
            <span className="todo-time">생성 {formatDateTime(todo.createdAt)}</span>
            {todo.completed && (
              <>
                <span className="todo-time">종료 {formatDateTime(todo.completedAt, true)}</span>
                <span className="todo-duration">{formatDuration(todo.createdAt, todo.completedAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button 
        onClick={() => deleteTodo(todo.id)} 
        className="delete-btn"
        aria-label={`Delete ${todo.text}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    </li>
  );
}
