import React, { Component } from 'react';
import Header from './Header/Header.js';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <p className="App-intro">
          App body
        </p>
      </div>
    );
  }
}

export default App;
