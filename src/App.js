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
  const [pageTab, setPageTab] = useState('home'); // 'home' or 'overview'
  const [activeTab, setActiveTab] = useState('active');
  const [activeCategory, setActiveCategory] = useState('assignment');
  const [subjects, setSubjects] = useState(['수학', '영어', '과학', '역사', '국어']);
  const [selectedSubject, setSelectedSubject] = useState('수학');
  const [data, setData] = useState({
    수학: { assignments: [], studies: [] },
    영어: { assignments: [], studies: [] },
    과학: { assignments: [], studies: [] },
    역사: { assignments: [], studies: [] },
    국어: { assignments: [], studies: [] },
  });
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
  const [selectedItem, setSelectedItem] = useState(null);
  const [overviewModalVisible, setOverviewModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState('');
  const [newSubjectEditName, setNewSubjectEditName] = useState('');

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
        const subjectKeys = Object.keys(parsedData);
        setSubjects(subjectKeys);
        if (subjectKeys.length > 0) {
          setSelectedSubject(subjectKeys[0]);
        }
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

  const addSubject = (subjectName) => {
    const name = subjectName || newSubject;
    if (!name.trim()) {
      return;
    }
    if (subjects.includes(name)) {
      alert('이미 존재하는 과목입니다.');
      return;
    }

    const newData = { ...data };
    newData[name] = { assignments: [], studies: [] };
    setData(newData);
    const newSubjects = [...subjects, name];
    setSubjects(newSubjects);
    setSelectedSubject(name);
    setNewSubject('');
  };

  const addItem = () => {
    if (!selectedSubject || ((activeCategory === 'assignment') && (!newTitle || !newDeadline)) || (activeCategory === 'study' && !newContent)) {
      return;
    }

    const newData = { ...data };
    if (!newData[selectedSubject]) {
      newData[selectedSubject] = { assignments: [], studies: [] };
    }

    const newId = Date.now();
    if (activeCategory === 'assignment') {
      newData[selectedSubject].assignments.push({
        id: newId,
        teacher: newTeacher,
        title: newTitle,
        deadline: newDeadline,
        details: newDetails,
        isFavorite: false,
        isCompleted: false,
      });
    } else {
      newData[selectedSubject].studies.push({
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

  const renameSubject = () => {
    if (!newSubjectEditName.trim() || newSubjectEditName === editingSubject) {
      setSubjectModalVisible(false);
      return;
    }

    const newSubjects = subjects.map(s => (s === editingSubject ? newSubjectEditName : s));
    setSubjects(newSubjects);

    const newData = { ...data };
    newData[newSubjectEditName] = newData[editingSubject];
    delete newData[editingSubject];
    setData(newData);

    if (selectedSubject === editingSubject) {
      setSelectedSubject(newSubjectEditName);
    }

    setSubjectModalVisible(false);
    setEditingSubject('');
    setNewSubjectEditName('');
  };

  const deleteSubject = () => {
    const newSubjects = subjects.filter(s => s !== editingSubject);
    setSubjects(newSubjects);
    const newData = { ...data };
    delete newData[editingSubject];
    setData(newData);

    if (selectedSubject === editingSubject) {
      setSelectedSubject(newSubjects[0] || '');
    }

    setSubjectModalVisible(false);
    setEditingSubject('');
    setNewSubjectEditName('');
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

  const deleteItem = (subject, itemId, isAssignment) => {
    if (window.confirm('정말 이 항목을 삭제하시겠습니까?')) {
      const newData = { ...data };
      const items = isAssignment
        ? newData[subject].assignments
        : newData[subject].studies;
      if (isAssignment) {
        newData[subject].assignments = items.filter(i => i.id !== itemId);
      } else {
        newData[subject].studies = items.filter(i => i.id !== itemId);
      }
      setData(newData);
    }
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

  const openOverviewModal = (type, subject, item) => {
    setSelectedItem({ type, subject, data: item });
    setOverviewModalVisible(true);
  };

  const renderHomeItems = () => {
    let itemsToDisplay = [];

    if (!selectedSubject) return itemsToDisplay;

    if (searchActive && searchQuery.trim()) {
      const results = getSearchResults();
      itemsToDisplay = results
        .filter(r => r.subject === selectedSubject)
        .map(r => ({
          type: r.type,
          subject: r.subject,
          data: r.data,
        }));
    } else {
      const subjectData = data[selectedSubject] || { assignments: [], studies: [] };
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
          subject: selectedSubject,
          data: item,
        });
      });
    }

    return itemsToDisplay;
  };

  const renderOverviewGrid = () => {
    const rows = [];
    for (let i = 0; i < subjects.length; i += 2) {
      rows.push(subjects.slice(i, i + 2));
    }
    return rows;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <h1>📋 SchoolTask</h1>
      </div>

      {/* Subject Selection Bar */}
      <div className="subject-bar">
        <div className="subject-buttons">
          {subjects.map(subject => (
            <button
              key={subject}
              className={`subject-button ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
        <button
          className="add-subject-button"
          onClick={() => {
            const name = prompt('과목명을 입력하세요');
            if (name && name.trim()) {
              addSubject(name.trim());
            }
          }}
        >
          +
        </button>
      </div>

      {/* Page Tabs Navigation */}
      <div className="page-tabs">
        <button
          className={`page-tab-button ${pageTab === 'home' ? 'active' : ''}`}
          onClick={() => setPageTab('home')}
        >
          Home
        </button>
        <button
          className={`page-tab-button ${pageTab === 'overview' ? 'active' : ''}`}
          onClick={() => setPageTab('overview')}
        >
          전체 보기
        </button>
      </div>

      {/* Home Tab */}
      {pageTab === 'home' && (
        <>
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
            {renderHomeItems().length === 0 ? (
              <div className="empty-message">
                {searchActive ? '검색 결과가 없습니다.' : '항목이 없습니다.'}
              </div>
            ) : (
              renderHomeItems().map((item) => (
                <div
                  key={`${item.subject}-${item.data.id}`}
                  className={`item-card ${isUrgent(item.data.deadline || '') ? 'urgent' : ''}`}
                >
                  <div className="item-content">
                    <div className="item-info">
                      <div className="item-meta">
                        {item.data.teacher} · {item.data.deadline} {getWeekday(item.data.deadline || '') && `${getWeekday(item.data.deadline)}`}
                      </div>
                      <div className="item-title-row">
                        <div className="item-title">
                          {item.data.title || item.data.content}
                        </div>
                        {item.data.details && (
                          <>
                            <div className="divider-vertical" />
                            <div className="item-details">
                              {item.data.details}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="item-actions">
                    {activeTab === 'active' && (
                      <button
                        className={`action-button star-button ${item.data.isFavorite ? 'active' : ''}`}
                        onClick={() => toggleFavorite(item.subject, item.data.id, item.type === 'assignment')}
                      >
                        {item.data.isFavorite ? '★' : '☆'}
                      </button>
                    )}
                    <button
                      className="action-button edit-button"
                      onClick={() => openEditModal(item.data, item.type === 'assignment', item.subject)}
                    >
                      수정
                    </button>
                    <button
                      className={`action-button complete-button ${item.data.isCompleted ? 'completed' : ''}`}
                      onClick={() => toggleComplete(item.subject, item.data.id, item.type === 'assignment')}
                    >
                      {activeTab === 'active' ? '완료' : '복구'}
                    </button>
                    <button
                      className="action-button delete-button"
                      onClick={() => deleteItem(item.subject, item.data.id, item.type === 'assignment')}
                    >
                      삭제
                    </button>
                  </div>
                  <div className="subject-tag">{item.subject}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Overview Tab */}
      {pageTab === 'overview' && (
        <div className="overview-container">
          <div className="grid-container">
            {renderOverviewGrid().map((row, rowIndex) => (
              <div key={rowIndex} className="grid-row">
                {row.map(subject => {
                  const subjectData = data[subject] || { assignments: [], studies: [] };
                  return (
                    <div key={subject} className="grid-card">
                      <div className="card-header">
                        <h3 className="card-subject-name">{subject}</h3>
                      </div>

                      {/* Assignments Section */}
                      <div className="card-section">
                        <div className="section-title">과제</div>
                        {subjectData.assignments.filter(a => !a.isCompleted).length > 0 ? (
                          subjectData.assignments.filter(a => !a.isCompleted).map(assignment => (
                            <div
                              key={assignment.id}
                              className={`card-item ${isUrgent(assignment.deadline) ? 'urgent' : ''}`}
                            >
                              <button
                                className="card-item-button"
                                onClick={() => openOverviewModal('assignment', subject, assignment)}
                              >
                                <span className="item-bullet">•</span>
                                <span className="item-name">{assignment.title}</span>
                                {assignment.isFavorite && <span className="item-favorite">★</span>}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="empty-section">-</div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="card-divider" />

                      {/* Studies Section */}
                      <div className="card-section">
                        <div className="section-title">공부</div>
                        {subjectData.studies.filter(s => !s.isCompleted).length > 0 ? (
                          subjectData.studies.filter(s => !s.isCompleted).map(study => (
                            <button
                              key={study.id}
                              className="card-item-button"
                              onClick={() => openOverviewModal('study', subject, study)}
                            >
                              <span className="item-bullet">•</span>
                              <span className="item-name">{study.content}</span>
                              {study.isFavorite && <span className="item-favorite">★</span>}
                            </button>
                          ))
                        ) : (
                          <div className="empty-section">-</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {row.length === 1 && <div className="grid-empty-card" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject Edit Modal */}
      {subjectModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content subject-modal">
            <h2>과목 편집</h2>
            <div className="form-field">
              <input
                type="text"
                value={newSubjectEditName}
                onChange={(e) => setNewSubjectEditName(e.target.value)}
                className="edit-input"
              />
            </div>
            <div className="modal-buttons subject-modal-buttons">
              <button
                className="delete-button"
                onClick={deleteSubject}
              >
                삭제
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setSubjectModalVisible(false);
                  setEditingSubject('');
                  setNewSubjectEditName('');
                }}
              >
                취소
              </button>
              <button
                className="save-button"
                onClick={renameSubject}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Long Press Context Menu */}
      {subjects.map(subject => (
        <div
          key={`context-${subject}`}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setEditingSubject(subject);
            setNewSubjectEditName(subject);
            setSubjectModalVisible(true);
          }}
        />
      ))}

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

      {/* Overview Modal */}
      {overviewModalVisible && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content overview-modal">
            <h2>{selectedItem.subject} {selectedItem.type === 'assignment' ? '과제' : '공부'}</h2>
            {selectedItem.type === 'assignment' ? (
              <>
                <div className="detail-row">
                  <span className="detail-label">과제명:</span>
                  <span className="detail-value">{selectedItem.data.title}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">선생님:</span>
                  <span className="detail-value">{selectedItem.data.teacher}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">제출기한:</span>
                  <span className="detail-value">{selectedItem.data.deadline}</span>
                </div>
              </>
            ) : (
              <>
                <div className="detail-row">
                  <span className="detail-label">선생님:</span>
                  <span className="detail-value">{selectedItem.data.teacher}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">내용:</span>
                  <span className="detail-value">{selectedItem.data.content}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">기한:</span>
                  <span className="detail-value">{selectedItem.data.deadline}</span>
                </div>
              </>
            )}
            <button
              className="close-button"
              onClick={() => setOverviewModalVisible(false)}
            >
              닫기
            </button>
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
