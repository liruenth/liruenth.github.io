import React, { Component } from 'react';
import logo from './blue eyes 8.jpg';
//import logo2 from './logo.svg';
import './Header.css';

class Header extends Component {

    render() {
        return (
            <div className="Header">
                <ul>
                    <li style={{float:"left"}}><img src={logo} className="Logo" alt="logo"/></li>
                    <li><a href="">Programs</a></li>
                    <li><a href="">Tutorials</a></li>
                    <li><a href="">Store</a></li>
                    <li><a href="">Glossary</a></li>
                    <li><a href="">{this.props.username ? this.props.username : "Login"}</a></li>
                </ul>
            </div>
        );
    }
}

export default Header;