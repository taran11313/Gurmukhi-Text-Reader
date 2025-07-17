import React, { useState } from 'react';
import './BookmarkPanel.css';

export interface BookmarkPanelProps {
  bookmarks: number[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddBookmark: (page: number) => void;
  onRemoveBookmark: (page: number) => void;
  onClearBookmarks: () => void;
  isBookmarked: (page: number) => boolean;
}

export const BookmarkPanel: React.FC<BookmarkPanelProps> = ({
  bookmarks,
  currentPage,
  onPageChange,
  onAddBookmark,
  onRemoveBookmark,
  onClearBookmarks,
  isBookmarked,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleCurrentPage = () => {
    if (isBookmarked(currentPage)) {
      onRemoveBookmark(currentPage);
    } else {
      onAddBookmark(currentPage);
    }
  };

  const handleBookmarkClick = (page: number) => {
    onPageChange(page);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all bookmarks?')) {
      onClearBookmarks();
    }
  };

  const sortedBookmarks = [...bookmarks].sort((a, b) => a - b);

  return (
    <div className="bookmark-panel">
      {/* Bookmark Toggle Button */}
      <button
        className={`bookmark-panel__toggle ${isBookmarked(currentPage) ? 'bookmark-panel__toggle--active' : ''}`}
        onClick={handleToggleCurrentPage}
        title={isBookmarked(currentPage) ? 'Remove bookmark' : 'Add bookmark'}
        aria-label={isBookmarked(currentPage) ? 'Remove bookmark from current page' : 'Add bookmark to current page'}
      >
        {isBookmarked(currentPage) ? '★' : '☆'}
      </button>

      {/* Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className="bookmark-panel__container">
          <button
            className="bookmark-panel__expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Hide' : 'Show'} bookmarks list`}
          >
            <span className="bookmark-panel__expand-text">
              Bookmarks ({bookmarks.length})
            </span>
            <span className={`bookmark-panel__expand-icon ${isExpanded ? 'bookmark-panel__expand-icon--expanded' : ''}`}>
              ▼
            </span>
          </button>

          {isExpanded && (
            <div className="bookmark-panel__list-container">
              <div className="bookmark-panel__header">
                <h3 className="bookmark-panel__title">Your Bookmarks</h3>
                {bookmarks.length > 0 && (
                  <button
                    className="bookmark-panel__clear-btn"
                    onClick={handleClearAll}
                    title="Clear all bookmarks"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="bookmark-panel__list">
                {sortedBookmarks.length === 0 ? (
                  <div className="bookmark-panel__empty">
                    <p>No bookmarks yet</p>
                    <p className="bookmark-panel__empty-hint">
                      Click the ☆ button to bookmark pages
                    </p>
                  </div>
                ) : (
                  <ul className="bookmark-panel__items" role="list">
                    {sortedBookmarks.map((page) => (
                      <li key={page} className="bookmark-panel__item">
                        <button
                          className={`bookmark-panel__page-btn ${page === currentPage ? 'bookmark-panel__page-btn--current' : ''}`}
                          onClick={() => handleBookmarkClick(page)}
                          title={`Go to page ${page}`}
                        >
                          <span className="bookmark-panel__page-number">
                            Page {page}
                          </span>
                          {page === currentPage && (
                            <span className="bookmark-panel__current-indicator">
                              (current)
                            </span>
                          )}
                        </button>
                        <button
                          className="bookmark-panel__remove-btn"
                          onClick={() => onRemoveBookmark(page)}
                          title={`Remove bookmark from page ${page}`}
                          aria-label={`Remove bookmark from page ${page}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};