import React from 'react';
import Modal from 'react-modal';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'ghostwhite',
  },
};

Modal.setAppElement('#root');

const submitButtonStyles = {
  backgroundColor: "lawngreen",
  fontWeight: "bold",
  fontSize: "large",
  border: "none",
  borderRadius: "5px",
  padding: "0.5em",
  margin: "0.5em",
  cursor: 'pointer',
};

const closeButtonStyles = {
  backgroundColor: "burlywood",
  fontWeight: "bold",
  fontSize: "large",
  border: "none",
  borderRadius: "5px",
  padding: "0.5em",
  margin: "0.5em",
  cursor: 'pointer',
};

function MyModal({isOpen, title, formFields, onSubmit, onClose}) {

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Example Modal"
    >
      <h2 style={{width: 'fit-content', margin: '0 auto'}}>{title}</h2>
      <form onSubmit={onSubmit}>
        {formFields}
        {onSubmit ? <input type="submit" value="Submit" style={submitButtonStyles} /> : null}
        <button onClick={onClose} style={closeButtonStyles}>{onSubmit ? "Cancel" : "Close"}</button>
      </form>
    </Modal>
  );
}

export default MyModal;