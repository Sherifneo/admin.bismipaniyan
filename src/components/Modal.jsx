import "./Modal.css";

export default function Modal({ title, onClose, children }) {
  return (
    <div className="bp-modal-overlay" onClick={onClose}>
      <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bp-modal-header">
          <h2 className="bp-modal-title">{title}</h2>
          <button type="button" className="bp-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="bp-modal-body">{children}</div>
      </div>
    </div>
  );
}
