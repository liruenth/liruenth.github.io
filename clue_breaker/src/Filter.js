import React, { useState, useEffect } from 'react';

function Card({type, onFilterChanged}) {

  const [active, setActive] = useState(true);

  const filterStyles = {
    backgroundColor: active ? "blue" : "gray",
    color: "white",
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    display: 'inline-block',
    borderRadius: '25px',
    padding: '0 25px',
    fontSize: '16px',
    height: '32px',
    lineHeight: '32px',
    margin: '5px',
  }

  useEffect(() => {
    onFilterChanged(type.toLowerCase(), active);
  }, [active]);

  const changeFilter = () => {
    setActive(!active);
  }

  return (
    <button style={filterStyles} onClick={changeFilter}>
      {type}
    </button>
  );
}

export default Card;