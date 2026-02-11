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
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  writeBatch,
  serverTimestamp 
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { SortableTodoItem } from './SortableTodoItem';
import './index.css'

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // 인증 상태 감시
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore 데이터 실시간 동기화
  useEffect(() => {
    if (!user) {
      setTodos([]);
      return;
    }

    const q = query(
      collection(db, "todos"),
      where("uid", "==", user.uid),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todoData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Firestore Timestamp를 Date 객체로 변환
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));
      setTodos(todoData);
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("로그인에 실패했습니다.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const addTodo = async () => {
    if (inputValue.trim() === '') {
      alert('리스트를 입력해 주세요.')
      return
    }
    if (!user) return;

    try {
      await addDoc(collection(db, "todos"), {
        uid: user.uid,
        text: inputValue,
        completed: false,
        createdAt: serverTimestamp(),
        order: todos.length > 0 ? todos[0].order - 1 : 0, // 새로운 항목을 가장 위에 배치 (사용자 요청 반영: setTodos([newTodo,...todos]))
      });
      setInputValue('')
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  }

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const todoRef = doc(db, "todos", id);
      const completed = !todo.completed;
      await updateDoc(todoRef, {
        completed,
        completedAt: completed ? serverTimestamp() : null
      });
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
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

  const deleteTodo = async (id) => {
    try {
      await deleteDoc(doc(db, "todos", id));
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex((item) => item.id === active.id);
      const newIndex = todos.findIndex((item) => item.id === over.id);
      const newTodos = arrayMove([...todos], oldIndex, newIndex);

      // Firestore 순서 업데이트 (Batch 사용)
      try {
        const batch = writeBatch(db);
        newTodos.forEach((todo, index) => {
          const todoRef = doc(db, "todos", todo.id);
          batch.update(todoRef, { order: index });
        });
        await batch.commit();
      } catch (error) {
        console.error("Error reordering todos:", error);
      }
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>기다려 주세용...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Todo List</h1>
          <p>리스트를 관리하려면 로그인해 주세요.</p>
          <button onClick={handleLogin} className="login-btn">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google로 시작하기
          </button>
        </div>
      </div>
    );
  }

  const activeTodo = activeId ? todos.find(t => t.id === activeId) : null;

  return (
    <div className="todo-container">
      <div className={`sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-top">
          <h1>Todo List</h1>
          <div className="user-profile">
            <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
            <button onClick={handleLogout} className="logout-btn">로그아웃</button>
          </div>
        </div>
        
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
