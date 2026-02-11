import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTodoItem } from './SortableTodoItem';
import './index.css'

function App() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(prev => {
        if (!prev && window.scrollY > 120) return true
        if (prev && window.scrollY < 20) return false
        return prev
      })
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const addTodo = () => {
    if (inputValue.trim() === '') {
      alert('리스트를 입력해 주세요.')
      return
    }
    const newTodo = {
      id: Date.now().toString(),
      text: inputValue,
      completed: false,
      createdAt: new Date(),
    }
    setTodos([...todos, newTodo])
    setInputValue('')
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const completed = !todo.completed;
        return { 
          ...todo, 
          completed, 
          completedAt: completed ? new Date() : null 
        };
      }
      return todo;
    }))
  }

  const formatDuration = (start, end) => {
    if (!start || !end) return '';
    const diffMs = new Date(end) - new Date(start);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay >= 1) {
      const remainingMin = diffMin % 60;
      return `${diffDay}일 ${remainingMin}분`;
    } else {
      const remainingSec = diffSec % 60;
      return `${diffMin}분 ${remainingSec}초`;
    }
  }

  const formatDateTime = (date, isEnd = false) => {
    if (!date) return '';
    const d = new Date(date);
    const formatted = d.toLocaleString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\. (\d{2})\. (\d{2})\./, '$1.$2.$3');
    
    if (isEnd) {
      return formatted.replace(/:/g, '.');
    }
    return formatted;
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTodos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.completed).length;
  const progressPercentage = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  const activeTodo = activeId ? todos.find(t => t.id === activeId) : null;

  return (
    <div className="todo-container">
      <div className={`sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        <h1>Todo List</h1>
        
        <div className="stats-dashboard">
          <div className="stats-info">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{totalTodos}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{completedTodos}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Progress</span>
              <span className="stat-value">{progressPercentage}%</span>
            </div>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="input-group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What needs to be done?"
            id="todo-input"
          />
          <button onClick={addTodo} className="add-btn" id="add-button">추가</button>
        </div>
      </div>

      <div className="content-body">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={todos.map(todo => todo.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="todo-list" id="todo-list">
              {todos.map(todo => (
                <SortableTodoItem
                  key={todo.id}
                  todo={todo}
                  toggleTodo={toggleTodo}
                  deleteTodo={deleteTodo}
                  formatDateTime={formatDateTime}
                  formatDuration={formatDuration}
                />
              ))}
            </ul>
          </SortableContext>
          
          {createPortal(
            <DragOverlay dropAnimation={dropAnimation}>
              {activeId ? (
                <div className="todo-item dragging-overlay">
                  <div className="todo-main">
                    <div className="drag-handle" style={{ color: '#22d3ee' }}>
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
                      <input type="checkbox" checked={activeTodo?.completed} readOnly className="todo-checkbox" />
                      <span className="checkmark"></span>
                    </label>
                    <div className="todo-content">
                      <span className="todo-text">{activeTodo?.text}</span>
                      <div className="todo-time-info">
                        <span className="todo-time">생성 {formatDateTime(activeTodo?.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
        {todos.length === 0 && (
          <div className="empty-state">
            <p>TO-DO 리스트를 추가해 주세요!!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
