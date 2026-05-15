import React, { useState, useEffect } from 'react';
import './App.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const STORAGE_KEY = 'schooltask_data';

const isValidDate = (dateStr) => {
  const regex = /^\d{1,2}\/\d{1,2}$/;
  if (!regex.test(dateStr)) return false;
  const [month, day] = dateStr.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
};

const isUrgent = (deadlineStr) => {
  const datePart = deadlineStr.split(' ')[0];
  if (!isValidDate(datePart)) return false;
  const [month, day] = datePart.split('/').map(Number);
  const year = new Date().getFullYear();
  const deadline = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
};

const getWeekday = (deadlineStr) => {
  const datePart = deadlineStr.split(' ')[0];
  if (!isValidDate(datePart)) return '';
  const [month, day] = datePart.split('/').map(Number);
  const year = new Date().getFullYear();
  const date = new Date(year, month - 1, day);
  return WEEKDAYS[date.getDay()];
};

function App() {
  const [activeTab, setActiveTab] = useState('active');
  const [activeCategory, setActiveCategory] = useState('assignment');
  const [subjects, setSubjects] = useState([]);
  const [data, setData] = useState({});
  const [newSubject, setNewSubject] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline');
  const [editingItem, setEditingItem] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const loadData = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setData(parsedData);
        setSubjects(Object.keys(parsedData));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const saveData = (newData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const addItem = () => {
    if (!newSubject || ((activeCategory === 'assignment') && (!newTitle || !newDeadline)) || (activeCategory === 'study' && !newContent)) {
      return;
    }

    const newData = { ...data };
    if (!newData[newSubject]) {
      newData[newSubject] = { assignments: [], studies: [] };
      setSubjects([...subjects, newSubject]);
    }

    const newId = Date.now();
    if (activeCategory === 'assignment') {
      newData[newSubject].assignments.push({
        id: newId,
        teacher: newTeacher,
        title: newTitle,
        deadline: newDeadline,
        details: newDetails,
        isFavorite: false,
        isCompleted: false,
      });
    } else {
      newData[newSubject].studies.push({
        id: newId,
        teacher: newTeacher,
        content: newContent,
        deadline: newDeadline,
        details: newDetails,
        isFavorite: false,
        isCompleted: false,
      });
    }

    setData(newData);
    setNewSubject('');
    setNewTeacher('');
    setNewTitle('');
    setNewContent('');
    setNewDeadline('');
    setNewDetails('');
  };

  const getSortedItems = (items) => {
    const favorites = items.filter(i => i.isFavorite);
    const rest = items.filter(i => !i.isFavorite);

    const sortFn = (a, b) => {
      if (sortBy === 'deadline') {
        return a.deadline.localeCompare(b.deadline);
      } else if (sortBy === 'teacher') {
        return a.teacher.localeCompare(b.teacher);
      } else {
        const nameA = a.title || a.content;
        const nameB = b.title || b.content;
        return nameA.localeCompare(nameB);
      }
    };

    return [...favorites.sort(sortFn), ...rest.sort(sortFn)];
  };

  const calculateMatchScore = (item, query) => {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    const teacher = item.teacher.toLowerCase();
    if (teacher.includes(lowerQuery)) score += 2;

    const name = (item.title || item.content || '').toLowerCase();
    if (name.includes(lowerQuery)) score += 3;

    const deadline = item.deadline || '';
    if (deadline.includes(query)) score += 1;

    return score;
  };

  const getSearchResults = () => {
    if (!searchQuery.trim()) {
      return null;
    }

    const results = [];
    Object.entries(data).forEach(([subject, subjectData]) => {
      const assignments = subjectData.assignments || [];
      const studies = subjectData.studies || [];

      assignments.forEach(assignment => {
        const score = calculateMatchScore(assignment, searchQuery);
        if (score > 0) {
          results.push({
            type: 'assignment',
            subject,
            data: assignment,
            score,
          });
        }
      });

      studies.forEach(study => {
        const score = calculateMatchScore(study, searchQuery);
        if (score > 0) {
          results.push({
            type: 'study',
            subject,
            data: study,
            score,
          });
        }
      });
    });

    return results.sort((a, b) => b.score - a.score);
  };

  const toggleFavorite = (subject, itemId, isAssignment) => {
    const newData = { ...data };
    const items = isAssignment
      ? newData[subject].assignments
      : newData[subject].studies;
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.isFavorite = !item.isFavorite;
    }
    setData(newData);
  };

  const toggleComplete = (subject, itemId, isAssignment) => {
    const newData = { ...data };
    const items = isAssignment
      ? newData[subject].assignments
      : newData[subject].studies;
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.isCompleted = !item.isCompleted;
    }
    setData(newData);
  };

  const updateItem = (subject, updatedItem, isAssignment) => {
    const newData = { ...data };
    const items = isAssignment
      ? newData[subject].assignments
      : newData[subject].studies;
    const index = items.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
    }
    setData(newData);
    setEditModalVisible(false);
    setEditingItem(null);
  };

  const openEditModal = (item, isAssignment, subject) => {
    setEditingItem({ item, isAssignment, subject });
    setEditModalVisible(true);
  };

  const renderItems = () => {
    let itemsToDisplay = [];

    if (searchActive && searchQuery.trim()) {
      const results = getSearchResults();
      itemsToDisplay = results.map(r => ({
        type: r.type,
        subject: r.subject,
        data: r.data,
      }));
    } else {
      Object.entries(data).forEach(([subject, subjectData]) => {
        const items = activeCategory === 'assignment'
          ? subjectData.assignments || []
          : subjectData.studies || [];

        const filtered = items.filter(item =>
          activeTab === 'active' ? !item.isCompleted : item.isCompleted
        );

        const sorted = getSortedItems(filtered);

        sorted.forEach(item => {
          itemsToDisplay.push({
            type: activeCategory,
            subject,
            data: item,
          });
        });
      });
    }

    return itemsToDisplay;
  };

  const items = renderItems();

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <h1>📋 SchoolTask</h1>
      </div>

      {/* Form Section */}
      <div className="form-section">
        <div className="category-tabs">
          <button
            className={`tab-button ${activeCategory === 'assignment' ? 'active' : ''}`}
            onClick={() => setActiveCategory('assignment')}
          >
            과제
          </button>
          <button
            className={`tab-button ${activeCategory === 'study' ? 'active' : ''}`}
            onClick={() => setActiveCategory('study')}
          >
            해야할 공부
          </button>
        </div>

        <div className="input-group">
          <input
            type="text"
            placeholder="과목"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="선생님"
            value={newTeacher}
            onChange={(e) => setNewTeacher(e.target.value)}
            className="input-field"
          />
          {activeCategory === 'assignment' ? (
            <>
              <input
                type="text"
                placeholder="과제명"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input-field"
              />
              <input
                type="text"
                placeholder="제출기한 (M/D)"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="input-field"
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="공부 내용"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="input-field"
              />
              <input
                type="text"
                placeholder="기한 (M/D)"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="input-field"
              />
            </>
          )}
          <textarea
            placeholder="자세한 내용 (선택)"
            value={newDetails}
            onChange={(e) => setNewDetails(e.target.value)}
            className="textarea-field"
            rows="2"
          />
        </div>

        <button onClick={addItem} className="add-button">
          + 추가
        </button>
      </div>

      {/* Tabs Section */}
      <div className="tabs-section">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            해야할 것
          </button>
          <button
            className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            완료된 것
          </button>
        </div>

        <div className="search-section">
          <button
            className="search-button"
            onClick={() => setSearchActive(!searchActive)}
          >
            🔍 검색
          </button>
          {searchActive && (
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          )}
        </div>
      </div>

      {/* Sort Section */}
      {(activeCategory === 'assignment' || (activeCategory === 'study' && !searchActive)) && (
        <div className="sort-section">
          {activeCategory === 'assignment' ? (
            <>
              <button
                className={`sort-button ${sortBy === 'deadline' ? 'active' : ''}`}
                onClick={() => setSortBy('deadline')}
              >
                제출기한
              </button>
              <button
                className={`sort-button ${sortBy === 'teacher' ? 'active' : ''}`}
                onClick={() => setSortBy('teacher')}
              >
                선생님
              </button>
              <button
                className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
                onClick={() => setSortBy('name')}
              >
                과제명
              </button>
            </>
          ) : (
            <>
              <button
                className={`sort-button ${sortBy === 'teacher' ? 'active' : ''}`}
                onClick={() => setSortBy('teacher')}
              >
                선생님
              </button>
              <button
                className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
                onClick={() => setSortBy('name')}
              >
                공부 이름
              </button>
            </>
          )}
        </div>
      )}

      {/* Items Section */}
      <div className="items-section">
        {items.length === 0 ? (
          <div className="empty-message">
            {searchActive ? '검색 결과가 없습니다.' : '항목이 없습니다.'}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.subject}-${item.data.id}`}
              className={`item-card ${isUrgent(item.data.deadline || '') ? 'urgent' : ''}`}
            >
              <div className="item-header">
                <div className="item-info">
                  <div className="item-title">
                    {item.type === 'assignment' ? item.data.title : item.data.content}
                  </div>
                  <div className="item-meta">
                    {item.data.teacher} · {item.data.deadline} {getWeekday(item.data.deadline || '') && `${getWeekday(item.data.deadline)}`}
                  </div>
                  {item.data.details && (
                    <div className="item-details">{item.data.details}</div>
                  )}
                </div>
              </div>

              <div className="item-actions">
                <button
                  className="action-button edit-button"
                  onClick={() => openEditModal(item.data, item.type === 'assignment', item.subject)}
                >
                  수정
                </button>
                <button
                  className={`action-button star-button ${item.data.isFavorite ? 'active' : ''}`}
                  onClick={() => toggleFavorite(item.subject, item.data.id, item.type === 'assignment')}
                >
                  {item.data.isFavorite ? '★' : '☆'}
                </button>
                <button
                  className={`action-button complete-button ${item.data.isCompleted ? 'completed' : ''}`}
                  onClick={() => toggleComplete(item.subject, item.data.id, item.type === 'assignment')}
                >
                  ✓
                </button>
              </div>
              <div className="subject-tag">{item.subject}</div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editModalVisible && editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>항목 수정</h2>
            <EditModal
              item={editingItem.item}
              isAssignment={editingItem.isAssignment}
              subject={editingItem.subject}
              onSave={(updated) => updateItem(editingItem.subject, updated, editingItem.isAssignment)}
              onCancel={() => {
                setEditModalVisible(false);
                setEditingItem(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({ item, isAssignment, subject, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    ...item,
  });

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="edit-form">
      {isAssignment ? (
        <>
          <div className="form-field">
            <label>과제명:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="edit-input"
            />
          </div>
          <div className="form-field">
            <label>선생님:</label>
            <input
              type="text"
              value={formData.teacher}
              onChange={(e) => handleChange('teacher', e.target.value)}
              className="edit-input"
            />
          </div>
          <div className="form-field">
            <label>제출기한:</label>
            <input
              type="text"
              value={formData.deadline}
              onChange={(e) => handleChange('deadline', e.target.value)}
              className="edit-input"
            />
          </div>
        </>
      ) : (
        <>
          <div className="form-field">
            <label>공부 내용:</label>
            <input
              type="text"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="edit-input"
            />
          </div>
          <div className="form-field">
            <label>선생님:</label>
            <input
              type="text"
              value={formData.teacher}
              onChange={(e) => handleChange('teacher', e.target.value)}
              className="edit-input"
            />
          </div>
          <div className="form-field">
            <label>기한:</label>
            <input
              type="text"
              value={formData.deadline}
              onChange={(e) => handleChange('deadline', e.target.value)}
              className="edit-input"
            />
          </div>
        </>
      )}
      <div className="form-field">
        <label>자세한 내용:</label>
        <textarea
          value={formData.details}
          onChange={(e) => handleChange('details', e.target.value)}
          className="edit-textarea"
          rows="3"
        />
      </div>
      <div className="modal-buttons">
        <button className="save-button" onClick={handleSave}>
          저장
        </button>
        <button className="cancel-button" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}

export default App;
