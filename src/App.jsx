import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(prev => {
        // Hysteresis: Use a higher threshold to enter scroll mode (to account for height reduction)
        // and a lower threshold to exit it.
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
      id: Date.now(),
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
      // 종료 시간은 사용자 요청에 따라 마스킹 (점 구분)
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

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.completed).length;
  const progressPercentage = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

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
        <ul className="todo-list" id="todo-list">
          {todos.map(todo => (
            <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <div className="todo-main">
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
          ))}
        </ul>
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
